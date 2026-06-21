const { pool } = require('./db');

class Moment {
  static async create(data) {
    const { content, userId, images = [] } = data;
    const [result] = await pool.execute(
      'INSERT INTO moments (userId, content, images, createdAt) VALUES (?, ?, ?, NOW())',
      [String(userId), content, JSON.stringify(images)]
    );
    const insertId = Number(result.insertId);
    return insertId;
  }

  static async findAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    const [rows] = await pool.execute(
      `SELECT m.id, m.userId, m.content, m.images, m.createdAt, m.moderationStatus, m.isBlocked, u.nickname, u.avatar
       FROM moments m
       LEFT JOIN st_users u ON m.userId = u.id
       ORDER BY m.createdAt DESC
       LIMIT ?, ?`,
      [String(offset), String(size)]
    );
    return rows.map(row => {
      const result = {
        id: row.id,
        userId: String(row.userId),
        content: row.content,
        images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [],
        createdAt: row.createdAt,
        moderationStatus: row.moderationStatus,
        isBlocked: Boolean(row.isBlocked),
        user: {
          id: String(row.userId),
          nickname: row.nickname || '未知用户',
          avatar: row.avatar || ''
        },
        likeCount: 0,
        commentCount: 0,
        liked: false,
        likedBy: [],
        comments: []
      };
      return result;
    });
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      `SELECT m.id, m.userId, m.content, m.images, m.createdAt, m.moderationStatus, m.isBlocked, u.nickname, u.avatar
       FROM moments m
       LEFT JOIN st_users u ON m.userId = u.id
       WHERE m.id = ?`,
      [id]
    );
    if (!rows[0]) return null;
    const row = rows[0];
    return {
      id: row.id,
      userId: String(row.userId),
      content: row.content,
      images: row.images ? (typeof row.images === 'string' ? JSON.parse(row.images) : row.images) : [],
      createdAt: row.createdAt,
      moderationStatus: row.moderationStatus,
      isBlocked: Boolean(row.isBlocked),
      user: {
        id: String(row.userId),
        nickname: row.nickname || '未知用户',
        avatar: row.avatar || ''
      }
    };
  }

  static async update(id, data) {
    const { content, images } = data;
    await pool.execute(
      'UPDATE moments SET content = ?, images = ? WHERE id = ?',
      [content, JSON.stringify(images || []), id]
    );
  }

  static async block(id, blockedText) {
    await pool.execute(
      'UPDATE moments SET content = ?, moderationStatus = ?, isBlocked = true WHERE id = ?',
      [blockedText, 'blocked', id]
    );
  }

  static async delete(id) {
    await pool.execute('DELETE FROM moments WHERE id = ?', [id]);
  }

  static async like(momentId, userId) {
    try {
      await pool.execute(
        'INSERT IGNORE INTO moment_likes (momentId, userId) VALUES (?, ?)',
        [momentId, String(userId)]
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  static async unlike(momentId, userId) {
    try {
      await pool.execute(
        'DELETE FROM moment_likes WHERE momentId = ? AND userId = ?',
        [momentId, String(userId)]
      );
      return true;
    } catch (e) {
      return false;
    }
  }

  static async getLikeCount(momentId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM moment_likes WHERE momentId = ?',
      [momentId]
    );
    return rows[0].count;
  }

  static async isLiked(momentId, userId) {
    const [rows] = await pool.execute(
      'SELECT * FROM moment_likes WHERE momentId = ? AND userId = ?',
      [momentId, String(userId)]
    );
    return rows.length > 0;
  }

  static async comment(momentId, userId, content) {
    try {
      const [result] = await pool.execute(
        'INSERT INTO moment_comments (momentId, userId, content, createdAt) VALUES (?, ?, ?, NOW())',
        [momentId, String(userId), content]
      );
      return result.insertId;
    } catch (e) {
      return null;
    }
  }

  static async getComments(momentId) {
    const [rows] = await pool.execute(
      `SELECT c.id, c.momentId, c.userId, c.content, c.createdAt, c.moderationStatus, c.isBlocked, u.nickname, u.avatar
       FROM moment_comments c
       LEFT JOIN st_users u ON c.userId = u.id
       WHERE c.momentId = ?
       ORDER BY c.createdAt ASC`,
      [momentId]
    );
    return rows.map(row => ({
      id: row.id,
      momentId: row.momentId,
      userId: String(row.userId),
      content: row.content,
      createdAt: row.createdAt,
      moderationStatus: row.moderationStatus,
      isBlocked: Boolean(row.isBlocked),
      user: {
        id: String(row.userId),
        nickname: row.nickname || '未知用户',
        avatar: row.avatar || ''
      }
    }));
  }

  static async getCommentCount(momentId) {
    const [rows] = await pool.execute(
      'SELECT COUNT(*) as count FROM moment_comments WHERE momentId = ?',
      [momentId]
    );
    return rows[0].count;
  }
}

module.exports = Moment;