const { pool } = require('./db');

function parseScreenshots(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return [];
    }
  }
  return [];
}

class Feedback {
  static async create(data) {
    const { userId, type, title, content, screenshots = [] } = data;
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      const [result] = await pool.execute(
        'INSERT INTO st_feedbacks (userId, type, title, content, screenshots, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, type, title, content, JSON.stringify(screenshots), 'pending', createdAt, createdAt]
      );
      return result.insertId;
    } catch (error) {
      console.error('创建反馈失败:', error);
      throw error;
    }
  }

  static async findByUserId(userId, page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_feedbacks WHERE userId = ? ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [userId, size, offset]
      );
      return rows.map(row => ({
        ...row,
        screenshots: parseScreenshots(row.screenshots)
      }));
    } catch (error) {
      console.error('获取用户反馈失败:', error);
      return [];
    }
  }

  static async findAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT f.*, u.username, u.nickname FROM st_feedbacks f LEFT JOIN st_users u ON f.userId = u.id ORDER BY f.createdAt DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      return rows.map(row => ({
        ...row,
        screenshots: parseScreenshots(row.screenshots)
      }));
    } catch (error) {
      console.error('获取反馈列表失败:', error);
      return [];
    }
  }

  static async findById(id) {
    try {
      const [rows] = await pool.execute(
        'SELECT f.*, u.username, u.nickname FROM st_feedbacks f LEFT JOIN st_users u ON f.userId = u.id WHERE f.id = ?',
        [id]
      );
      const row = rows[0];
      if (!row) return null;
      return {
        ...row,
        screenshots: parseScreenshots(row.screenshots)
      };
    } catch (error) {
      console.error('获取反馈详情失败:', error);
      return null;
    }
  }

  static async update(id, updates) {
    const allowedFields = ['status', 'reply'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (fields.length === 0) {
      return false;
    }

    fields.push('updatedAt = ?');
    values.push(new Date().toISOString().slice(0, 19).replace('T', ' '));
    values.push(id);

    try {
      await pool.execute(`UPDATE st_feedbacks SET ${fields.join(', ')} WHERE id = ?`, values);
      return true;
    } catch (error) {
      console.error('更新反馈失败:', error);
      return false;
    }
  }

  static async delete(id) {
    try {
      await pool.execute('DELETE FROM st_feedbacks WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除反馈失败:', error);
      return false;
    }
  }

  static async getCount(status = null) {
    try {
      let query = 'SELECT COUNT(*) as count FROM st_feedbacks';
      let params = [];

      if (status) {
        query += ' WHERE status = ?';
        params.push(status);
      }

      const [rows] = await pool.execute(query, params);
      return rows[0].count;
    } catch (error) {
      console.error('获取反馈数量失败:', error);
      return 0;
    }
  }
}

module.exports = Feedback;