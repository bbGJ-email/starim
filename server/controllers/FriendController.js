const User = require('../models/User');
const { pool } = require('../models/db');
const { generateId } = require('../utils/idGenerator');

class FriendController {
  static async getList(req, res) {
    try {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      let friends = [];
      try {
        if (user.friends) {
          if (typeof user.friends === 'string') {
            friends = user.friends.startsWith('[') 
              ? JSON.parse(user.friends) 
              : user.friends.split(',').filter(f => f.trim());
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

      res.json({ ok: true, data: detailedFriends });
    } catch (error) {
      res.json({ ok: false, msg: '获取好友列表失败', error: error.message });
    }
  }

  static async add(req, res) {
    try {
      const { friendId, message = '' } = req.body;
      if (!friendId) {
        return res.json({ ok: false, msg: '缺少好友ID' });
      }
      if (friendId === req.user.id) {
        return res.json({ ok: false, msg: '不能添加自己为好友' });
      }

      const friend = await User.findById(friendId);
      if (!friend) {
        return res.json({ ok: false, msg: '用户不存在' });
      }

      // 检查是否已是好友
      const user = await User.findById(req.user.id);
      let friends = [];
      try {
        if (user.friends) {
          friends = typeof user.friends === 'string' 
            ? (user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(','))
            : user.friends;
        }
      } catch (e) { friends = []; }

      if (friends.includes(friendId)) {
        return res.json({ ok: false, msg: '已是好友' });
      }

      // 如果对方需要验证，创建好友请求
      if (friend.friendVerification) {
        const requestId = generateId();
        const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
        
        await pool.execute(
          `CREATE TABLE IF NOT EXISTS st_friend_requests (
            id VARCHAR(36) PRIMARY KEY,
            fromUserId VARCHAR(36) NOT NULL,
            toUserId VARCHAR(36) NOT NULL,
            message TEXT,
            status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
            createdAt DATETIME
          )`
        );

        await pool.execute(
          'INSERT INTO st_friend_requests (id, fromUserId, toUserId, message, status, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
          [requestId, req.user.id, friendId, message, 'pending', createdAt]
        );

        // 通过Socket推送好友请求
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${friendId}`).emit('friend_request', {
            id: requestId,
            fromUser: User.filterSensitiveInfo(req.user),
            message,
            createdAt
          });
        }

        return res.json({ ok: true, msg: '好友请求已发送，等待对方确认' });
      }

      // 直接添加为好友
      await FriendController._addFriendToBoth(req.user.id, friendId);

      res.json({ ok: true, msg: '添加好友成功' });
    } catch (error) {
      res.json({ ok: false, msg: '添加好友失败', error: error.message });
    }
  }

  static async _addFriendToBoth(userId1, userId2) {
    const user1 = await User.findById(userId1);
    const user2 = await User.findById(userId2);

    let friends1 = [];
    let friends2 = [];

    try {
      if (user1.friends) {
        friends1 = typeof user1.friends === 'string'
          ? (user1.friends.startsWith('[') ? JSON.parse(user1.friends) : user1.friends.split(','))
          : user1.friends;
      }
    } catch (e) { friends1 = []; }

    try {
      if (user2.friends) {
        friends2 = typeof user2.friends === 'string'
          ? (user2.friends.startsWith('[') ? JSON.parse(user2.friends) : user2.friends.split(','))
          : user2.friends;
      }
    } catch (e) { friends2 = []; }

    if (!friends1.includes(userId2)) friends1.push(userId2);
    if (!friends2.includes(userId1)) friends2.push(userId1);

    await pool.execute('UPDATE st_users SET friends = ? WHERE id = ?', [JSON.stringify(friends1), userId1]);
    await pool.execute('UPDATE st_users SET friends = ? WHERE id = ?', [JSON.stringify(friends2), userId2]);
  }

  static async delete(req, res) {
    try {
      const { friendId } = req.body;
      if (!friendId) {
        return res.json({ ok: false, msg: '缺少好友ID' });
      }

      const user = await User.findById(req.user.id);
      const friend = await User.findById(friendId);

      let friends1 = [];
      let friends2 = [];

      try {
        if (user.friends) {
          friends1 = typeof user.friends === 'string'
            ? (user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(','))
            : user.friends;
        }
      } catch (e) { friends1 = []; }

      try {
        if (friend && friend.friends) {
          friends2 = typeof friend.friends === 'string'
            ? (friend.friends.startsWith('[') ? JSON.parse(friend.friends) : friend.friends.split(','))
            : friend.friends;
        }
      } catch (e) { friends2 = []; }

      friends1 = friends1.filter(id => id !== friendId);
      friends2 = friends2.filter(id => id !== req.user.id);

      await pool.execute('UPDATE st_users SET friends = ? WHERE id = ?', [JSON.stringify(friends1), req.user.id]);
      if (friend) {
        await pool.execute('UPDATE st_users SET friends = ? WHERE id = ?', [JSON.stringify(friends2), friendId]);
      }

      res.json({ ok: true, msg: '删除好友成功' });
    } catch (error) {
      res.json({ ok: false, msg: '删除好友失败', error: error.message });
    }
  }

  static async getRequests(req, res) {
    try {
      await pool.execute(
        `CREATE TABLE IF NOT EXISTS st_friend_requests (
          id VARCHAR(36) PRIMARY KEY,
          fromUserId VARCHAR(36) NOT NULL,
          toUserId VARCHAR(36) NOT NULL,
          message TEXT,
          status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
          createdAt DATETIME
        )`
      );

      const [rows] = await pool.execute(
        'SELECT * FROM st_friend_requests WHERE toUserId = ? AND status = ? ORDER BY createdAt DESC',
        [req.user.id, 'pending']
      );

      const requests = [];
      for (const row of rows) {
        const fromUser = await User.findById(row.fromUserId);
        if (fromUser) {
          requests.push({
            ...row,
            fromUser: User.filterSensitiveInfo(fromUser)
          });
        }
      }

      res.json({ ok: true, data: requests });
    } catch (error) {
      res.json({ ok: false, msg: '获取好友请求失败', error: error.message });
    }
  }

  static async accept(req, res) {
    try {
      const { requestId } = req.body;
      if (!requestId) {
        return res.json({ ok: false, msg: '缺少请求ID' });
      }

      const [rows] = await pool.execute(
        'SELECT * FROM st_friend_requests WHERE id = ? AND toUserId = ?',
        [requestId, req.user.id]
      );

      if (rows.length === 0) {
        return res.json({ ok: false, msg: '请求不存在' });
      }

      const request = rows[0];
      if (request.status !== 'pending') {
        return res.json({ ok: false, msg: '请求已处理' });
      }

      await FriendController._addFriendToBoth(req.user.id, request.fromUserId);

      await pool.execute(
        'UPDATE st_friend_requests SET status = ? WHERE id = ?',
        ['accepted', requestId]
      );

      // 通知请求方
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${request.fromUserId}`).emit('friend_request_accepted', {
          friend: User.filterSensitiveInfo(req.user)
        });
      }

      res.json({ ok: true, msg: '已接受好友请求' });
    } catch (error) {
      res.json({ ok: false, msg: '接受好友请求失败', error: error.message });
    }
  }

  static async reject(req, res) {
    try {
      const { requestId } = req.body;
      if (!requestId) {
        return res.json({ ok: false, msg: '缺少请求ID' });
      }

      await pool.execute(
        'UPDATE st_friend_requests SET status = ? WHERE id = ? AND toUserId = ?',
        ['rejected', requestId, req.user.id]
      );

      res.json({ ok: true, msg: '已拒绝好友请求' });
    } catch (error) {
      res.json({ ok: false, msg: '拒绝好友请求失败', error: error.message });
    }
  }
}

module.exports = FriendController;
