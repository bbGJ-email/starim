const User = require('../models/User');
const { pool } = require('../models/db');
const { getLastSeen, isUserOnline } = require('../utils/onlineUsers');

class UserController {
  static async getStatus(req, res) {
    try {
      const { userId } = req.body;
      const lastSeen = getLastSeen(userId);
      const isOnline = isUserOnline(userId);
      
      res.json({ ok: true, online: isOnline, lastSeen });
    } catch (error) {
      res.json({ ok: false, msg: '获取状态失败', error: error.message });
    }
  }

  static async getInfo(req, res) {
    try {
      const targetUserId = req.body?.userId || req.user.id;
      const user = await User.findById(targetUserId);
      
      if (!user) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      const userInfo = User.filterSensitiveInfo(user);
      userInfo.online = isUserOnline(targetUserId);

      if (targetUserId === req.user.id) {
        const [referredUsers] = await pool.execute(
          'SELECT COUNT(*) as count FROM st_users WHERE referredBy = ?',
          [targetUserId]
        );
        const referralCount = referredUsers[0].count || 0;
        userInfo.referralCount = referralCount;
        userInfo.svipThreshold = 5;
        userInfo.referralProgress = Math.min(100, Math.round((referralCount / 5) * 100));
      }

      res.json({ ok: true, data: userInfo });
    } catch (error) {
      res.json({ ok: false, msg: '获取用户信息失败', error: error.message });
    }
  }

  static async search(req, res) {
    try {
      const { keyword } = req.body;
      if (!keyword) {
        return res.json({ ok: false, msg: '关键词不能为空' });
      }

      const users = await User.search(keyword);
      res.json({ ok: true, list: users });
    } catch (error) {
      res.json({ ok: false, msg: '搜索失败', error: error.message });
    }
  }

  static async update(req, res) {
    try {
      const { nickname, avatar, friendVerification, desktopNotifications, soundNotifications } = req.body;
      const updates = {};
      
      if (nickname !== undefined) updates.nickname = nickname;
      if (avatar !== undefined) updates.avatar = avatar;
      if (friendVerification !== undefined) updates.friendVerification = friendVerification;
      if (desktopNotifications !== undefined) updates.desktopNotifications = desktopNotifications;
      if (soundNotifications !== undefined) updates.soundNotifications = soundNotifications;

      const success = await User.update(req.user.id, updates);
      if (success) {
        const updatedUser = await User.findById(req.user.id);
        res.json({ ok: true, msg: '更新成功', user: User.filterSensitiveInfo(updatedUser) });
      } else {
        res.json({ ok: false, msg: '更新失败' });
      }
    } catch (error) {
      res.json({ ok: false, msg: '更新失败', error: error.message });
    }
  }

  static async updatePassword(req, res) {
    try {
      const { oldPassword, newPassword } = req.body;
      if (!oldPassword || !newPassword) {
        return res.json({ ok: false, msg: '密码不能为空' });
      }
      if (newPassword.length < 6) {
        return res.json({ ok: false, msg: '新密码长度至少为6个字符' });
      }

      const user = await User.findById(req.user.id);
      const isValid = await User.verifyPassword(oldPassword, user.password);
      if (!isValid) {
        return res.json({ ok: false, msg: '原密码错误' });
      }

      const success = await User.updatePassword(req.user.id, newPassword);
      res.json({ ok: success, msg: success ? '密码修改成功' : '密码修改失败' });
    } catch (error) {
      res.json({ ok: false, msg: '修改密码失败', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { password } = req.body;
      const user = await User.findById(req.user.id);
      const isValid = await User.verifyPassword(password, user.password);
      if (!isValid) {
        return res.json({ ok: false, msg: '密码错误' });
      }

      const success = await User.delete(req.user.id);
      res.json({ ok: success, msg: success ? '账号已删除' : '删除失败' });
    } catch (error) {
      res.json({ ok: false, msg: '删除账号失败', error: error.message });
    }
  }

  static async getSelf(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      const userInfo = User.filterSensitiveInfo(user);

      let friends = [];
      try {
        if (user.friends) {
          if (typeof user.friends === 'string') {
            friends = user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(',').filter(f => f.trim());
          } else if (Array.isArray(user.friends)) {
            friends = user.friends;
          }
        }
      } catch (e) {
        friends = [];
      }

      const detailedFriends = [];
      for (const fid of friends) {
        if (!fid || !fid.trim()) continue;
        const friend = await User.findById(fid);
        if (friend) {
          detailedFriends.push({
            id: friend.id,
            username: friend.username,
            nickname: friend.nickname,
            avatar: friend.avatar,
            isAdmin: friend.isAdmin,
            isBanned: friend.isBanned,
            isSVIP: friend.isSVIP
          });
        }
      }

      const [groups] = await pool.execute(
        `SELECT g.* FROM st_groups g
         JOIN st_group_members gm ON g.id = gm.groupId
         WHERE gm.userId = ?
         ORDER BY g.createdAt DESC`,
        [req.user.id]
      );

      const groupsList = [];
      for (const g of groups) {
        const [lastMessageResult] = await pool.execute(
          `SELECT * FROM st_messages WHERE groupId = ? ORDER BY timestamp DESC LIMIT 1`,
          [g.id]
        );
        const lastMessage = lastMessageResult[0] || null;

        const [unreadResult] = await pool.execute(
          `SELECT COUNT(*) as count FROM st_messages WHERE groupId = ? AND receiverId = ? AND \`read\` = false`,
          [g.id, req.user.id]
        );
        const unreadCount = unreadResult[0].count || 0;

        const [membersCountResult] = await pool.execute(
          'SELECT COUNT(*) as count FROM st_group_members WHERE groupId = ?',
          [g.id]
        );
        const membersCount = membersCountResult[0].count || 0;

        groupsList.push({
          ...g,
          lastMessage: lastMessage ? lastMessage.content : null,
          lastMessageTime: lastMessage ? new Date(lastMessage.timestamp).toISOString() : null,
          unreadCount,
          membersCount
        });
      }

      res.json({
        ok: true,
        info: { ...userInfo, groups: groupsList, friends: detailedFriends },
        friends: detailedFriends
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取用户信息失败', error: error.message });
    }
  }

  static async getReferralStats(req, res) {
    try {
      const [referredUsers] = await pool.execute(
        'SELECT id, username, nickname, createdAt FROM st_users WHERE referredBy = ?',
        [req.user.id]
      );
      
      res.json({
        ok: true,
        count: referredUsers.length,
        threshold: 5,
        progress: Math.min(100, Math.round((referredUsers.length / 5) * 100)),
        users: referredUsers
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取邀请统计失败', error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const userId = req.body?.userId || req.user.id;
      const user = await User.findById(userId);
      
      let friendCount = 0;
      try {
        let friends = [];
        if (user.friends) {
          if (typeof user.friends === 'string') {
            friends = user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(',').filter(f => f.trim());
          } else if (Array.isArray(user.friends)) {
            friends = user.friends;
          }
        }
        friendCount = friends.length;
      } catch (e) {
        friendCount = 0;
      }

      const [groupCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM st_group_members WHERE userId = ?',
        [userId]
      );

      const [momentCount] = await pool.execute(
        'SELECT COUNT(*) as count FROM moments WHERE userId = ?',
        [userId]
      );

      res.json({
        ok: true,
        data: {
          friendCount: friendCount,
          groupCount: groupCount[0].count,
          momentCount: momentCount[0].count
        }
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取统计数据失败', error: error.message });
    }
  }
}

module.exports = UserController;