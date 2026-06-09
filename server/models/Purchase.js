const { pool } = require('./db');

class Purchase {
  static async create(purchaseData) {
    const {
      username,
      type,
      details,
      paymentProof
    } = purchaseData;

    try {
      const [result] = await pool.execute(
        'INSERT INTO st_purchases (username, type, details, paymentProof, status) VALUES (?, ?, ?, ?, ?)',
        [username, type, JSON.stringify(details), paymentProof, 'pending']
      );
      return await this.findById(result.insertId);
    } catch (error) {
      console.error('创建购买申请失败:', error);
      throw error;
    }
  }

  static async findById(purchaseId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_purchases WHERE id = ?', [purchaseId]);
      const purchase = rows[0] || null;
      
      if (purchase && typeof purchase.details === 'string') {
        try {
          purchase.details = JSON.parse(purchase.details);
        } catch (e) {
          purchase.details = {};
        }
      }
      
      return purchase;
    } catch (error) {
      console.error('查询购买申请失败:', error);
      return null;
    }
  }

  static async getAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_purchases ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM st_purchases');
      
      const purchases = rows.map(purchase => {
        if (typeof purchase.details === 'string') {
          try {
            purchase.details = JSON.parse(purchase.details);
          } catch (e) {
            purchase.details = {};
          }
        }
        return purchase;
      });
      
      return {
        purchases,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('获取购买申请列表失败:', error);
      return { purchases: [], total: 0 };
    }
  }

  static async approve(purchaseId) {
    try {
      await pool.execute(
        'UPDATE st_purchases SET status = ? WHERE id = ?',
        ['approved', purchaseId]
      );
      return true;
    } catch (error) {
      console.error('审核通过失败:', error);
      return false;
    }
  }

  static async reject(purchaseId) {
    try {
      await pool.execute(
        'UPDATE st_purchases SET status = ? WHERE id = ?',
        ['rejected', purchaseId]
      );
      return true;
    } catch (error) {
      console.error('拒绝申请失败:', error);
      return false;
    }
  }

  static async delete(purchaseId) {
    try {
      await pool.execute('DELETE FROM st_purchases WHERE id = ?', [purchaseId]);
      return true;
    } catch (error) {
      console.error('删除购买申请失败:', error);
      return false;
    }
  }
}

module.exports = Purchase;
