const User = require('../models/User');
const EmailVerificationCode = require('../models/EmailVerificationCode');
const { pool } = require('../models/db');
const { getLastSeen, isUserOnline } = require('../utils/onlineUsers');
const { getClientIP, recordRiskEvent } = require('../middlewares/ipBan');
const { sendEmailCode } = require('../utils/email');
const config = require('../config/app');

function maskRealName(name) {
  if (!name) return '';
  if (name.length <= 1) return '*';
  return `${name[0]}${'*'.repeat(name.length - 1)}`;
}

function maskIdCard(idcard) {
  if (!idcard || idcard.length < 8) return '';
  return `${idcard.slice(0, 3)}***********${idcard.slice(-4)}`;
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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

  static async getRealNameStatus(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      res.json({
        ok: true,
        data: {
          status: user.realNameStatus || 'unverified',
          realNameMasked: user.realNameMasked || '',
          idCardMasked: user.idCardMasked || '',
          gender: user.realNameGender || '',
          birthday: user.realNameBirthday || '',
          region: user.realNameRegion || ''
        }
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取实名认证状态失败', error: error.message });
    }
  }

  static async submitRealName(req, res) {
    try {
      const name = String(req.body?.name || '').trim();
      const idcard = String(req.body?.idcard || req.body?.idCard || '').trim();

      if (!name || !idcard) {
        return res.json({ ok: false, msg: '姓名和身份证号不能为空' });
      }
      if (!/^.{2,30}$/.test(name) || !/^\d{17}[\dXx]$/.test(idcard)) {
        return res.json({ ok: false, msg: '姓名或身份证号格式不正确' });
      }
      if (!config.identityAuth.url) {
        return res.json({ ok: false, msg: '实名认证服务暂不可用' });
      }

      const response = await fetch(config.identityAuth.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, idcard })
      });
      const result = await response.json();

      if (result.showapi_res_code !== 0) {
        return res.json({ ok: false, msg: result.showapi_res_error || '实名认证服务调用失败' });
      }

      const body = result.showapi_res_body || {};
      if (body.code !== 0) {
        return res.json({ ok: false, msg: body.msg || '姓名与身份证号不匹配' });
      }

      const region = [body.province, body.city, body.county].filter(Boolean).join(' ');
      const success = await User.updateRealName(req.user.id, {
        status: 'verified',
        realNameMasked: maskRealName(name),
        idCardMasked: maskIdCard(idcard),
        gender: body.sex || '',
        birthday: body.birthday || '',
        region
      });

      if (!success) {
        return res.json({ ok: false, msg: '保存实名认证状态失败' });
      }

      res.json({
        ok: true,
        msg: '实名认证成功',
        data: {
          status: 'verified',
          realNameMasked: maskRealName(name),
          idCardMasked: maskIdCard(idcard),
          gender: body.sex || '',
          birthday: body.birthday || '',
          region
        }
      });
    } catch (error) {
      res.json({ ok: false, msg: '实名认证失败，请稍后再试', error: error.message });
    }
  }

  static async sendBindEmailCode(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      if (!isValidEmail(email)) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json({ ok: false, msg: '邮箱格式不正确' });
      }

      const coolingDown = await EmailVerificationCode.isCoolingDown(email, 'bind_email', req.user.id);
      if (coolingDown) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json({ ok: false, msg: '验证码发送过于频繁，请稍后再试' });
      }

      const code = EmailVerificationCode.generateCode();
      await EmailVerificationCode.create(email, 'bind_email', code, getClientIP(req), req.user.id);
      await sendEmailCode(email, code, 'bind_email');

      res.json({ ok: true, msg: '验证码已发送' });
    } catch (error) {
      res.json({ ok: false, msg: '发送验证码失败', error: error.message });
    }
  }

  static async confirmBindEmail(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code || '').trim();
      if (!isValidEmail(email) || !code) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json({ ok: false, msg: '邮箱或验证码不正确' });
      }

      const result = await EmailVerificationCode.verify(email, 'bind_email', code, req.user.id);
      if (!result.ok) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json(result);
      }

      const success = await User.bindEmail(req.user.id, email);
      res.json({ ok: success, msg: success ? '邮箱绑定成功' : '邮箱绑定失败' });
    } catch (error) {
      res.json({ ok: false, msg: '绑定邮箱失败', error: error.message });
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