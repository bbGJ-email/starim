const { pool } = require('./db');

class Report {
  static async create(reportData) {
    const {
      id,
      reporterId,
      targetType,
      targetId,
      reason,
      description
    } = reportData;

    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      await pool.execute(
        `INSERT INTO st_reports 
        (id, reporterId, targetType, targetId, reason, description, status, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)`,
        [id, reporterId, targetType, targetId, reason, description, createdAt]
      );
      return await this.findById(id);
    } catch (error) {
      console.error('创建投诉失败:', error);
      throw error;
    }
  }

  static async findById(reportId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_reports WHERE id = ?', [reportId]);
      return rows[0] || null;
    } catch (error) {
      console.error('查询投诉失败:', error);
      return null;
    }
  }

  static async getByReporter(reporterId) {
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_reports WHERE reporterId = ? ORDER BY createdAt DESC',
        [reporterId]
      );
      return rows;
    } catch (error) {
      console.error('获取用户投诉列表失败:', error);
      return [];
    }
  }

  static async getAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_reports ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM st_reports');
      return {
        reports: rows,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('获取投诉列表失败:', error);
      return { reports: [], total: 0 };
    }
  }

  static async handle(reportId, adminId, response, status) {
    const handledAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    try {
      await pool.execute(
        'UPDATE st_reports SET status = ?, adminResponse = ?, handledBy = ?, handledAt = ? WHERE id = ?',
        [status, response, adminId, handledAt, reportId]
      );
      return true;
    } catch (error) {
      console.error('处理投诉失败:', error);
      return false;
    }
  }

  static async delete(reportId) {
    try {
      await pool.execute('DELETE FROM st_reports WHERE id = ?', [reportId]);
      return true;
    } catch (error) {
      console.error('删除投诉失败:', error);
      return false;
    }
  }
}

module.exports = Report;
