const Message = require('../models/Message');
const User = require('../models/User');
const Group = require('../models/Group');
const { pool } = require('../models/db');
const { generateId } = require('../utils/idGenerator');
const { filterSensitiveWords, sanitizeText } = require('../utils/sanitize');

class MessageController {
  static async getList(req, res) {
    try {
      const { chatId, type, page = 1, size = 50 } = req.body;
      
      if (!chatId || !type) {
        return res.json({ ok: false, msg: '缺少参数' });
      }

      let messages = [];
      if (type === 'private') {
        messages = await Message.getPrivateMessages(req.user.id, chatId, size);
      } else if (type === 'group') {
        messages = await Message.getGroupMessages(chatId, size);
      }

      // 为每条消息附加发送者信息
      for (const msg of messages) {
        const sender = await User.findById(msg.senderId);
        if (sender) {
          msg.sender = User.filterSensitiveInfo(sender);
        }
        // 解析JSON字段
        if (typeof msg.quotedMessage === 'string') {
          try { msg.quotedMessage = JSON.parse(msg.quotedMessage); } catch (e) {}
        }
        if (typeof msg.cardUser === 'string') {
          try { msg.cardUser = JSON.parse(msg.cardUser); } catch (e) {}
        }
        if (typeof msg.cardGroup === 'string') {
          try { msg.cardGroup = JSON.parse(msg.cardGroup); } catch (e) {}
        }
      }

      res.json({ ok: true, data: messages });
    } catch (error) {
      res.json({ ok: false, msg: '获取消息失败', error: error.message });
    }
  }

  static async send(req, res) {
    try {
      const { receiverId, groupId, content, type = 'text', fileName, quotedMessage, cardUser, cardGroup } = req.body;

      if (!content && type === 'text') {
        return res.json({ ok: false, msg: '消息内容不能为空' });
      }

      if (!receiverId && !groupId) {
        return res.json({ ok: false, msg: '必须指定接收者或群组' });
      }

      // 过滤敏感词
      let filteredContent = content;
      if (type === 'text' && content) {
        filteredContent = await filterSensitiveWords(content);
      }

      const messageId = generateId();
      const message = await Message.create({
        id: messageId,
        senderId: req.user.id,
        receiverId: receiverId || null,
        groupId: groupId || null,
        content: filteredContent,
        type,
        fileName,
        quotedMessage,
        cardUser,
        cardGroup
      });

      // 添加发送者信息
      message.sender = User.filterSensitiveInfo(req.user);

      // 通过Socket.IO推送消息
      const io = req.app.get('io');
      if (io) {
        if (groupId) {
          io.to(`group_${groupId}`).emit('new_message', message);
        } else if (receiverId) {
          io.to(`user_${receiverId}`).emit('new_message', message);
          io.to(`user_${req.user.id}`).emit('new_message', message);
        }
      }

      res.json({ ok: true, msg: '发送成功', message });
    } catch (error) {
      res.json({ ok: false, msg: '发送消息失败', error: error.message });
    }
  }

  static async markRead(req, res) {
    try {
      const { messageId } = req.body;
      if (!messageId) {
        return res.json({ ok: false, msg: '缺少消息ID' });
      }

      const success = await Message.markAsRead(messageId);
      
      // 通知发送者消息已读
      const message = await Message.findById(messageId);
      if (message) {
        const io = req.app.get('io');
        if (io && message.senderId) {
          io.to(`user_${message.senderId}`).emit('message_read', { messageId });
        }
      }

      res.json({ ok: success });
    } catch (error) {
      res.json({ ok: false, msg: '标记已读失败', error: error.message });
    }
  }

  static async recall(req, res) {
    try {
      const { messageId } = req.body;
      if (!messageId) {
        return res.json({ ok: false, msg: '缺少消息ID' });
      }

      const message = await Message.findById(messageId);
      if (!message) {
        return res.json({ ok: false, msg: '消息不存在' });
      }

      if (message.senderId !== req.user.id) {
        return res.json({ ok: false, msg: '只能撤回自己的消息' });
      }

      // 检查是否在2分钟内
      const msgTime = new Date(message.timestamp).getTime();
      const now = Date.now();
      if (now - msgTime > 2 * 60 * 1000) {
        return res.json({ ok: false, msg: '只能撤回2分钟内的消息' });
      }

      const success = await Message.recall(messageId);

      // 通知所有相关用户
      const io = req.app.get('io');
      if (io && success) {
        if (message.groupId) {
          io.to(`group_${message.groupId}`).emit('message_recalled', { messageId });
        } else if (message.receiverId) {
          io.to(`user_${message.receiverId}`).emit('message_recalled', { messageId });
          io.to(`user_${message.senderId}`).emit('message_recalled', { messageId });
        }
      }

      res.json({ ok: success, msg: success ? '撤回成功' : '撤回失败' });
    } catch (error) {
      res.json({ ok: false, msg: '撤回消息失败', error: error.message });
    }
  }
}

module.exports = MessageController;
