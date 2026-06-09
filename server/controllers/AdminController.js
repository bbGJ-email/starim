const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { pool } = require('../models/db');

class AdminController {
  static async getUsers(req, res) {
    try {
      const { page = 1, size = 20 } = req.body;
      const result = await User.getAll(page, size);
      const users = result.users.map(u => User.filterSensitiveInfo(u));
      res.json({ ok: true, data: users, total: result.total });
    } catch (error) {
      res.json({ ok: false, msg: '获取用户列表失败', error: error.message });
    }
  }

  static async getGroups(req, res) {
    try {
      const { page = 1, size = 20 } = req.body;
      const result = await Group.getAll(page, size);

      for (const g of result.groups) {
        g.membersCount = await Group.getMemberCount(g.id);
      }

      res.json({ ok: true, list: result.groups, total: result.total });
    } catch (error) {
      res.json({ ok: false, msg: '获取群组列表失败', error: error.message });
    }
  }

  static async getMessages(req, res) {
    try {
      const { page = 1, size = 50 } = req.body;
      const result = await Message.getAll(page, size);
      res.json({ ok: true, list: result.messages, total: result.total });
    } catch (error) {
      res.json({ ok: false, msg: '获取消息列表失败', error: error.message });
    }
  }

  static async broadcast(req, res) {
    try {
      const { content } = req.body;
      if (!content) {
        return res.json({ ok: false, msg: '内容不能为空' });
      }

      // 通过Socket广播
      const io = req.app.get('io');
      if (io) {
        io.emit('broadcast', {
          content,
          from: req.user.username,
          timestamp: new Date().toISOString()
        });
      }

      res.json({ ok: true, msg: '广播已发送' });
    } catch (error) {
      res.json({ ok: false, msg: '广播失败', error: error.message });
    }
  }

  static async toggleBan(req, res) {
    try {
      const { userId, isBanned } = req.body;
      const success = await User.setBanned(userId, isBanned);
      res.json({ ok: success, msg: success ? '操作成功' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }

  static async setAdmin(req, res) {
    try {
      const { userId, isAdmin } = req.body;
      const success = await User.setAdmin(userId, isAdmin);
      res.json({ ok: success, msg: success ? '操作成功' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }

  static async setSVIP(req, res) {
    try {
      const { userId, isSVIP } = req.body;
      const success = await User.setSVIP(userId, isSVIP);
      res.json({ ok: success, msg: success ? '操作成功' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }

  static async toggleGroupBan(req, res) {
    try {
      const { groupId, isBanned } = req.body;
      const success = await Group.setBanned(groupId, isBanned);
      res.json({ ok: success, msg: success ? '操作成功' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }

  static async deleteMessage(req, res) {
    try {
      const { messageId } = req.body;
      const success = await Message.delete(messageId);
      res.json({ ok: success, msg: success ? '删除成功' : '删除失败' });
    } catch (error) {
      res.json({ ok: false, msg: '删除失败', error: error.message });
    }
  }

  static async getUserIPs(req, res) {
    try {
      const { userId } = req.body;
      const user = await User.findById(userId);
      if (!user) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      res.json({
        ok: true,
        registerIP: user.registerIP,
        lastLoginIP: user.lastLoginIP
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取IP失败', error: error.message });
    }
  }

  static async banIP(req, res) {
    try {
      const { ip, reason = '', expiresAt = null } = req.body;
      if (!ip) {
        return res.json({ ok: false, msg: '缺少IP地址' });
      }

      await pool.execute(
        `CREATE TABLE IF NOT EXISTS st_bannedIPs (
          id INT AUTO_INCREMENT PRIMARY KEY,
          ip VARCHAR(45) UNIQUE NOT NULL,
          reason VARCHAR(255),
          bannedBy VARCHAR(36),
          bannedAt DATETIME,
          expiresAt DATETIME
        )`
      );

      const bannedAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await pool.execute(
        'INSERT INTO st_bannedIPs (ip, reason, bannedBy, bannedAt, expiresAt) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE reason = ?, bannedAt = ?, expiresAt = ?',
        [ip, reason, req.user.id, bannedAt, expiresAt, reason, bannedAt, expiresAt]
      );

      res.json({ ok: true, msg: 'IP已封禁' });
    } catch (error) {
      res.json({ ok: false, msg: '封禁IP失败', error: error.message });
    }
  }

  static async unbanIP(req, res) {
    try {
      const { ip } = req.body;
      await pool.execute('DELETE FROM st_bannedIPs WHERE ip = ?', [ip]);
      res.json({ ok: true, msg: 'IP已解封' });
    } catch (error) {
      res.json({ ok: false, msg: '解封IP失败', error: error.message });
    }
  }

  static async getBannedIPs(req, res) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_bannedIPs ORDER BY bannedAt DESC');
      res.json({ ok: true, list: rows });
    } catch (error) {
      res.json({ ok: false, msg: '获取封禁IP失败', error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const [userCount] = await pool.execute('SELECT COUNT(*) as count FROM st_users');
      const [groupCount] = await pool.execute('SELECT COUNT(*) as count FROM st_groups');
      const [messageCount] = await pool.execute('SELECT COUNT(*) as count FROM st_messages');
      const [pendingReports] = await pool.execute('SELECT COUNT(*) as count FROM reports WHERE status = "pending"');
      const [pendingPurchases] = await pool.execute('SELECT COUNT(*) as count FROM st_purchases WHERE status = "pending"');

      const onlineUsers = req.app.get('onlineUsers') || new Map();

      res.json({
        ok: true,
        data: {
          onlineCount: onlineUsers.size,
          totalUsers: userCount[0].count,
          totalGroups: groupCount[0].count,
          totalMessages: messageCount[0].count,
          pendingReports: pendingReports[0].count,
          pendingPurchases: pendingPurchases[0].count
        }
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取统计数据失败', error: error.message });
    }
  }
}

module.exports = AdminController;
