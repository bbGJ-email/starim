const { pool } = require('./db');

class Message {
  /**
   * 创建消息
   */
  static async create(messageData) {
    const {
      id,
      senderId,
      receiverId = null,
      groupId = null,
      content,
      type = 'text',
      fileName = null,
      quotedMessage = null,
      cardUser = null,
      cardGroup = null
    } = messageData;

    const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      await pool.execute(
        `INSERT INTO st_messages 
        (id, senderId, receiverId, groupId, content, type, fileName, timestamp, quotedMessage, cardUser, cardGroup, moderationStatus, isBlocked) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          senderId,
          receiverId,
          groupId,
          content,
          type,
          fileName,
          timestamp,
          quotedMessage ? JSON.stringify(quotedMessage) : null,
          cardUser ? JSON.stringify(cardUser) : null,
          cardGroup ? JSON.stringify(cardGroup) : null,
          'pending',
          false
        ]
      );
      return await this.findById(id);
    } catch (error) {
      console.error('创建消息失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取消息
   */
  static async findById(messageId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_messages WHERE id = ?', [messageId]);
      return rows[0] || null;
    } catch (error) {
      console.error('查询消息失败:', error);
      return null;
    }
  }

  /**
   * 获取私聊消息历史
   */
  static async getPrivateMessages(userId1, userId2, limit = 50) {
    try {
      const [rows] = await pool.execute(
        `SELECT * FROM st_messages 
        WHERE ((senderId = ? AND receiverId = ?) OR (senderId = ? AND receiverId = ?))
        AND groupId IS NULL
        ORDER BY timestamp DESC LIMIT ?`,
        [userId1, userId2, userId2, userId1, limit]
      );
      return rows.reverse();
    } catch (error) {
      console.error('获取私聊消息失败:', error);
      return [];
    }
  }

  /**
   * 获取群聊消息历史
   */
  static async getGroupMessages(groupId, limit = 50) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_messages WHERE groupId = ? ORDER BY timestamp DESC LIMIT ?',
        [groupId, limit]
      );
      return rows.reverse();
    } catch (error) {
      console.error('获取群聊消息失败:', error);
      return [];
    }
  }

  /**
   * 标记消息为已读
   */
  static async markAsRead(messageId) {
    try {
      await pool.execute('UPDATE st_messages SET `read` = true WHERE id = ?', [messageId]);
      return true;
    } catch (error) {
      console.error('标记消息已读失败:', error);
      return false;
    }
  }

  /**
   * 撤回消息
   */
  static async recall(messageId) {
    try {
      await pool.execute('UPDATE st_messages SET isRecalled = true WHERE id = ?', [messageId]);
      return true;
    } catch (error) {
      console.error('撤回消息失败:', error);
      return false;
    }
  }

  /**
   * 屏蔽消息
   */
  static async block(messageId, blockedText) {
    try {
      await pool.execute(
        'UPDATE st_messages SET content = ?, moderationStatus = ?, isBlocked = true WHERE id = ?',
        [blockedText, 'blocked', messageId]
      );
      return true;
    } catch (error) {
      console.error('屏蔽消息失败:', error);
      return false;
    }
  }

  /**
   * 删除消息
   */
  static async delete(messageId) {
    try {
      await pool.execute('DELETE FROM st_messages WHERE id = ?', [messageId]);
      return true;
    } catch (error) {
      console.error('删除消息失败:', error);
      return false;
    }
  }

  /**
   * 获取未读消息数量
   */
  static async getUnreadCount(userId, chatId, isGroup = false) {
    try {
      let query, params;
      if (isGroup) {
        query = 'SELECT COUNT(*) as count FROM st_messages WHERE groupId = ? AND senderId != ? AND `read` = false';
        params = [chatId, userId];
      } else {
        query = 'SELECT COUNT(*) as count FROM st_messages WHERE senderId = ? AND receiverId = ? AND `read` = false';
        params = [chatId, userId];
      }
      const [rows] = await pool.execute(query, params);
      return rows[0].count;
    } catch (error) {
      console.error('获取未读消息数量失败:', error);
      return 0;
    }
  }

  /**
   * 获取所有消息（管理员）
   */
  static async getAll(page = 1, size = 50) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_messages ORDER BY timestamp DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM st_messages');
      return {
        messages: rows,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('获取消息列表失败:', error);
      return { messages: [], total: 0 };
    }
  }
}

module.exports = Message;
