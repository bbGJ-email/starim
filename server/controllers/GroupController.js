const Group = require('../models/Group');
const User = require('../models/User');
const { pool } = require('../models/db');
const { generateId } = require('../utils/idGenerator');

class GroupController {
  static async getList(req, res) {
    try {
      console.log('getList - req.user:', req.user ? req.user.id : 'undefined');
      console.log('getList - req.body:', req.body);
      const userId = (req.body && req.body.userId) || (req.user ? req.user.id : null);
      console.log('getList - userId:', userId);

      if (!userId) {
        return res.json({ ok: false, msg: '用户未登录' });
      }

      const groups = await Group.getUserGroups(userId);

      const list = [];
      for (const g of groups) {
        const [lastMessageResult] = await pool.execute(
          `SELECT * FROM st_messages WHERE groupId = ? ORDER BY timestamp DESC LIMIT 1`,
          [g.id]
        );
        const lastMessage = lastMessageResult[0] || null;

        const [unreadResult] = await pool.execute(
          `SELECT COUNT(*) as count FROM st_messages WHERE groupId = ? AND receiverId = ? AND \`read\` = false`,
          [g.id, userId]
        );
        const unreadCount = unreadResult[0].count || 0;

        const membersCount = await Group.getMemberCount(g.id);

        list.push({
          ...g,
          lastMessage: lastMessage ? lastMessage.content : null,
          lastMessageTime: lastMessage ? new Date(lastMessage.timestamp).toISOString() : null,
          unreadCount,
          membersCount
        });
      }

      res.json({ ok: true, data: list });
    } catch (error) {
      res.json({ ok: false, msg: '获取群组列表失败', error: error.message });
    }
  }

  static async create(req, res) {
    try {
      const { name, type = 'public', avatar = null, announcement = '' } = req.body;
      
      if (!name || name.trim().length === 0) {
        return res.json({ ok: false, msg: '群名称不能为空' });
      }
      if (name.length > 50) {
        return res.json({ ok: false, msg: '群名称不能超过50个字符' });
      }

      const groupId = generateId();
      const group = await Group.create({
        id: groupId,
        name: name.trim(),
        type,
        creatorId: req.user.id,
        avatar,
        announcement
      });

      // 加入socket房间
      const io = req.app.get('io');
      if (io) {
        const sockets = await io.in(`user_${req.user.id}`).fetchSockets();
        for (const s of sockets) {
          s.join(`group_${groupId}`);
        }
      }

      res.json({ ok: true, msg: '创建成功', group });
    } catch (error) {
      res.json({ ok: false, msg: '创建群组失败', error: error.message });
    }
  }

  static async getInfo(req, res) {
    try {
      const { groupId } = req.body;
      if (!groupId) {
        return res.json({ ok: false, msg: '缺少群组ID' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.json({ ok: false, msg: '群组不存在' });
      }

      const members = await Group.getMembers(groupId);
      group.members = members;
      group.membersCount = members.length;

      res.json({ ok: true, info: group, group });
    } catch (error) {
      res.json({ ok: false, msg: '获取群组信息失败', error: error.message });
    }
  }

  static async manage(req, res) {
    try {
      const { groupId, action, targetUserId, value } = req.body;
      
      if (!groupId || !action) {
        return res.json({ ok: false, msg: '缺少参数' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.json({ ok: false, msg: '群组不存在' });
      }

      // 权限检查
      const isCreator = group.creatorId === req.user.id;
      const isAdmin = group.admins.includes(req.user.id);
      
      if (!isCreator && !isAdmin && !req.user.isAdmin) {
        return res.json({ ok: false, msg: '没有管理权限' });
      }

      let success = false;
      let msg = '';

      switch (action) {
        case 'addAdmin':
          if (!isCreator) {
            return res.json({ ok: false, msg: '只有群主可以添加管理员' });
          }
          if (!group.admins.includes(targetUserId)) {
            group.admins.push(targetUserId);
            success = await Group.update(groupId, { admins: group.admins });
            msg = '已添加管理员';
          }
          break;

        case 'removeAdmin':
          if (!isCreator) {
            return res.json({ ok: false, msg: '只有群主可以移除管理员' });
          }
          group.admins = group.admins.filter(id => id !== targetUserId);
          success = await Group.update(groupId, { admins: group.admins });
          msg = '已移除管理员';
          break;

        case 'mute':
          if (!group.mutedMembers.includes(targetUserId)) {
            group.mutedMembers.push(targetUserId);
            success = await Group.update(groupId, { mutedMembers: group.mutedMembers });
            msg = '已禁言';
          }
          break;

        case 'unmute':
          group.mutedMembers = group.mutedMembers.filter(id => id !== targetUserId);
          success = await Group.update(groupId, { mutedMembers: group.mutedMembers });
          msg = '已解禁';
          break;

        case 'kick':
          success = await Group.removeMember(groupId, targetUserId);
          msg = '已踢出群聊';
          
          // 通知被踢用户
          const io = req.app.get('io');
          if (io && success) {
            io.to(`user_${targetUserId}`).emit('group_kicked', { groupId });
          }
          break;

        case 'updateName':
          if (!isCreator && !isAdmin) {
            return res.json({ ok: false, msg: '没有权限' });
          }
          success = await Group.update(groupId, { name: value });
          msg = '群名称已更新';
          break;

        case 'updateAnnouncement':
          if (!isCreator && !isAdmin) {
            return res.json({ ok: false, msg: '没有权限' });
          }
          success = await Group.update(groupId, { announcement: value });
          msg = '群公告已更新';
          break;

        case 'updateAvatar':
          if (!isCreator && !isAdmin) {
            return res.json({ ok: false, msg: '没有权限' });
          }
          success = await Group.update(groupId, { avatar: value });
          msg = '群头像已更新';
          break;

        case 'dissolve':
          if (!isCreator) {
            return res.json({ ok: false, msg: '只有群主可以解散群组' });
          }
          success = await Group.delete(groupId);
          msg = '群组已解散';
          break;

        default:
          return res.json({ ok: false, msg: '未知操作' });
      }

      res.json({ ok: success, msg });
    } catch (error) {
      res.json({ ok: false, msg: '群组管理失败', error: error.message });
    }
  }

  static async join(req, res) {
    try {
      const { groupId } = req.body;
      if (!groupId) {
        return res.json({ ok: false, msg: '缺少群组ID' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.json({ ok: false, msg: '群组不存在' });
      }

      if (group.isBanned) {
        return res.json({ ok: false, msg: '群组已被封禁' });
      }

      const members = await Group.getMembers(groupId);
      if (members.includes(req.user.id)) {
        return res.json({ ok: false, msg: '已在群中' });
      }

      const success = await Group.addMember(groupId, req.user.id);

      // 加入socket房间并通知群成员
      const io = req.app.get('io');
      if (io && success) {
        const sockets = await io.in(`user_${req.user.id}`).fetchSockets();
        for (const s of sockets) {
          s.join(`group_${groupId}`);
        }

        // 如果是SVIP，发送特殊欢迎消息
        if (req.user.isSVIP) {
          io.to(`group_${groupId}`).emit('svip_join', {
            groupId,
            user: User.filterSensitiveInfo(req.user)
          });
        }
      }

      res.json({ ok: success, msg: success ? '加入成功' : '加入失败' });
    } catch (error) {
      res.json({ ok: false, msg: '加入群组失败', error: error.message });
    }
  }

  static async getCard(req, res) {
    try {
      const { groupId } = req.body;
      if (!groupId) {
        return res.json({ ok: false, msg: '缺少群组ID' });
      }

      const group = await Group.findById(groupId);
      if (!group) {
        return res.json({ ok: false, msg: '群组不存在' });
      }

      const membersCount = await Group.getMemberCount(groupId);

      res.json({
        ok: true,
        group: {
          id: group.id,
          name: group.name,
          type: group.type,
          avatar: group.avatar,
          membersCount,
          announcement: group.announcement || ''
        }
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取群名片失败', error: error.message });
    }
  }
}

module.exports = GroupController;
