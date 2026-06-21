const config = require('../config/app');
const Message = require('../models/Message');
const Moment = require('../models/Moment');
const User = require('../models/User');
const { pool } = require('../models/db');
const { moderateContent } = require('./contentModeration');

const BLOCKED_TEXT = '检测到敏感内容，已自动屏蔽';

const queue = [];
let running = false;

function enqueue(task) {
  if (!task || typeof task.run !== 'function') return;
  queue.push(task);
  schedule();
}

function schedule() {
  if (running) return;
  running = true;
  setImmediate(processQueue);
}

async function processQueue() {
  while (queue.length > 0) {
    const task = queue.shift();
    try {
      await task.run();
    } catch (error) {
      console.error('异步内容审核任务失败:', error.message);
    }
  }
  running = false;
  if (queue.length > 0) schedule();
}

function getBlockedText() {
  return config.contentModeration?.blockedText === BLOCKED_TEXT
    ? config.contentModeration.blockedText
    : BLOCKED_TEXT;
}

function isTextContent(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function notifyMessageUpdated(io, message) {
  if (!io || !message) return;

  if (message.groupId) {
    io.to(`group_${message.groupId}`).emit('message_updated', { message });
  } else if (message.receiverId) {
    io.to(`user_${message.receiverId}`).emit('message_updated', { message });
    io.to(`user_${message.senderId}`).emit('message_updated', { message });
  }
}

async function blockMessage(messageId, io) {
  await Message.block(messageId, getBlockedText());
  const message = await Message.findById(messageId);
  if (!message) return;

  const sender = await User.findById(message.senderId);
  if (sender) {
    message.sender = User.filterSensitiveInfo(sender);
  }

  notifyMessageUpdated(io, message);
}

function enqueueMessageModeration({ messageId, content, senderId, receiverId, groupId, io }) {
  if (!messageId || !isTextContent(content)) return;

  enqueue({
    run: async () => {
      const result = await moderateContent(content, {
        type: 'message',
        messageId,
        senderId,
        receiverId,
        groupId
      });
      if (result?.sensitive) {
        await blockMessage(messageId, io);
      }
    }
  });
}

function enqueueMomentModeration({ momentId, content, userId }) {
  if (!momentId || !isTextContent(content)) return;

  enqueue({
    run: async () => {
      const result = await moderateContent(content, {
        type: 'moment',
        momentId,
        userId
      });
      if (result?.sensitive) {
        await Moment.block(momentId, getBlockedText());
      }
    }
  });
}

function enqueueMomentCommentModeration({ commentId, momentId, content, userId }) {
  if (!commentId || !isTextContent(content)) return;

  enqueue({
    run: async () => {
      const result = await moderateContent(content, {
        type: 'moment_comment',
        commentId,
        momentId,
        userId
      });
      if (result?.sensitive) {
        await pool.execute(
          'UPDATE moment_comments SET content = ?, moderationStatus = ?, isBlocked = true WHERE id = ?',
          [getBlockedText(), 'blocked', commentId]
        );
      }
    }
  });
}

function enqueuePublicAccountModeration({ accountId, name, description, ownerId }) {
  if (!accountId) return;
  const text = [name, description].filter(isTextContent).join('\n');
  if (!text) return;

  enqueue({
    run: async () => {
      const result = await moderateContent(text, {
        type: 'public_account',
        accountId,
        ownerId
      });
      if (result?.sensitive) {
        await pool.execute(
          'UPDATE st_public_accounts SET name = ?, description = ?, moderationStatus = ?, isBlocked = true WHERE id = ?',
          [getBlockedText(), getBlockedText(), 'blocked', accountId]
        );
      }
    }
  });
}

module.exports = {
  enqueueMessageModeration,
  enqueueMomentModeration,
  enqueueMomentCommentModeration,
  enqueuePublicAccountModeration
};
