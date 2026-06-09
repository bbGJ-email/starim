const jwt = require('jsonwebtoken');
const config = require('../config/app');
const User = require('../models/User');
const Group = require('../models/Group');
const Message = require('../models/Message');
const { removeOnlineStatus, updateOnlineStatus } = require('../utils/onlineUsers');

const socketUserMap = new Map();
const userSocketMap = new Map();

function initSocketHandlers(io) {
  io.on('connection', (socket) => {
    console.log(`Socket已连接: ${socket.id}`);

    let heartbeatTimer = null;

    const resetHeartbeat = () => {
      if (heartbeatTimer) clearTimeout(heartbeatTimer);
      heartbeatTimer = setTimeout(() => {
        console.log(`Socket心跳超时: ${socket.id}`);
        socket.disconnect();
      }, 120000);
    };

    // 认证
    socket.on('authenticate', async (data) => {
      try {
        const { userId, token } = data;
        if (!userId || !token) {
          socket.emit('authenticated', { ok: false, msg: '缺少认证信息' });
          return;
        }

        const decoded = jwt.verify(token, config.jwt.secret);
        if (decoded.id !== userId) {
          socket.emit('authenticated', { ok: false, msg: '认证失败' });
          return;
        }

        const user = await User.findById(userId);
        if (!user) {
          socket.emit('authenticated', { ok: false, msg: '用户不存在' });
          return;
        }

        if (user.isBanned) {
          socket.emit('authenticated', { ok: false, msg: '账号已被封禁' });
          return;
        }

        // 记录socket与用户的映射
        socketUserMap.set(socket.id, userId);
        if (!userSocketMap.has(userId)) {
          userSocketMap.set(userId, new Set());
        }
        userSocketMap.get(userId).add(socket.id);

        // 更新在线状态
        updateOnlineStatus(userId);

        // 加入用户房间
        socket.join(`user_${userId}`);

        // 加入用户所在的所有群组房间
        const groups = await Group.getUserGroups(userId);
        for (const g of groups) {
          socket.join(`group_${g.id}`);
        }

        socket.emit('authenticated', {
          ok: true,
          user: User.filterSensitiveInfo(user)
        });

        // 通知好友该用户上线
        let friends = [];
        try {
          if (user.friends) {
            friends = typeof user.friends === 'string'
              ? (user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(','))
              : user.friends;
          }
        } catch (e) { friends = []; }

        for (const fid of friends) {
          if (fid && fid.trim()) {
            io.to(`user_${fid}`).emit('user_status_change', {
              userId,
              online: true
            });
          }
        }

        resetHeartbeat();
        console.log(`用户 ${userId} 认证成功`);
      } catch (error) {
        console.error('Socket认证失败:', error);
        if (error.name === 'TokenExpiredError') {
          socket.emit('token_expired');
        } else {
          socket.emit('authenticated', { ok: false, msg: '认证失败' });
        }
      }
    });

    // 心跳
    socket.on('heartbeat', () => {
      const userId = socketUserMap.get(socket.id);
      if (userId) {
        updateOnlineStatus(userId);
      }
      socket.emit('heartbeat_ack');
      resetHeartbeat();
    });

    // 获取聊天历史
    socket.on('get_chat_history', async (data) => {
      try {
        const { userId, chatId, type } = data;
        let messages = [];

        if (type === 'private') {
          messages = await Message.getPrivateMessages(userId, chatId, 500);
        } else if (type === 'group') {
          messages = await Message.getGroupMessages(chatId, 500);
        }

        // 一次性处理所有消息
        for (const msg of messages) {
          if (typeof msg.quotedMessage === 'string') {
            try { msg.quotedMessage = JSON.parse(msg.quotedMessage); } catch (e) {}
          }
          if (typeof msg.cardUser === 'string') {
            try { msg.cardUser = JSON.parse(msg.cardUser); } catch (e) {}
          }
          if (typeof msg.cardGroup === 'string') {
            try { msg.cardGroup = JSON.parse(msg.cardGroup); } catch (e) {}
          }

          const sender = await User.findById(msg.senderId);
          if (sender) {
            msg.sender = User.filterSensitiveInfo(sender);
          }
        }

        // 一次性发送所有消息
        socket.emit('chat_history', { ok: true, messages });
      } catch (error) {
        console.error('获取聊天历史失败:', error);
        socket.emit('chat_history', { ok: false, error: error.message });
      }
    });

    // 语音通话信令
    socket.on('voice_call_request', (data) => {
      const { receiverId } = data;
      io.to(`user_${receiverId}`).emit('voice_call_request', data);
    });

    socket.on('voice_call_accept', (data) => {
      const { callerId } = data;
      io.to(`user_${callerId}`).emit('voice_call_accept', data);
    });

    socket.on('voice_call_reject', (data) => {
      const { callerId } = data;
      io.to(`user_${callerId}`).emit('voice_call_reject', data);
    });

    // WebRTC信令转发
    socket.on('webrtc_signal', (data) => {
      const { targetUserId, signal } = data;
      io.to(`user_${targetUserId}`).emit('webrtc_signal', {
        fromUserId: socketUserMap.get(socket.id),
        signal
      });
    });

    // 断开连接
    socket.on('disconnect', () => {
      console.log(`Socket已断开: ${socket.id}`);
      const userId = socketUserMap.get(socket.id);
      
      if (userId) {
        socketUserMap.delete(socket.id);
        const userSockets = userSocketMap.get(userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userSocketMap.delete(userId);
            removeOnlineStatus(userId);

            // 通知好友该用户下线
            User.findById(userId).then(user => {
              if (!user) return;
              let friends = [];
              try {
                if (user.friends) {
                  friends = typeof user.friends === 'string'
                    ? (user.friends.startsWith('[') ? JSON.parse(user.friends) : user.friends.split(','))
                    : user.friends;
                }
              } catch (e) { friends = []; }

              for (const fid of friends) {
                if (fid && fid.trim()) {
                  io.to(`user_${fid}`).emit('user_status_change', {
                    userId,
                    online: false
                  });
                }
              }
            });
          }
        }
      }

      if (heartbeatTimer) clearTimeout(heartbeatTimer);
    });
  });

  console.log('✅ Socket.IO 处理器已初始化');
}

module.exports = {
  initSocketHandlers,
  socketUserMap,
  userSocketMap
};
