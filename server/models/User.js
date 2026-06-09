const { pool } = require('./db');
const bcrypt = require('bcrypt');

class User {
  /**
   * 根据ID获取用户
   */
  static async findById(userId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_users WHERE id = ?', [userId]);
      return rows[0] || null;
    } catch (error) {
      console.error('查询用户失败:', error);
      return null;
    }
  }

  /**
   * 根据用户名获取用户
   */
  static async findByUsername(username) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_users WHERE username = ?', [username]);
      return rows[0] || null;
    } catch (error) {
      console.error('查询用户失败:', error);
      return null;
    }
  }

  /**
   * 创建新用户
   */
  static async create(userData) {
    const {
      id,
      username,
      password,
      nickname = username,
      avatar = '',
      invitationCode = null,
      referredBy = null,
      registerIP = null
    } = userData;

    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    try {
      await pool.execute(
        `INSERT INTO st_users 
        (id, username, password, nickname, avatar, invitationCode, referredBy, registerIP, createdAt, updatedAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, username, hashedPassword, nickname, avatar, invitationCode, referredBy, registerIP, now, now]
      );
      return await this.findById(id);
    } catch (error) {
      console.error('创建用户失败:', error);
      throw error;
    }
  }

  /**
   * 更新用户信息
   */
  static async update(userId, updates) {
    const allowedFields = ['nickname', 'avatar', 'friendVerification', 'desktopNotifications', 'soundNotifications'];
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
    values.push(userId);

    try {
      await pool.execute(
        `UPDATE st_users SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return true;
    } catch (error) {
      console.error('更新用户失败:', error);
      return false;
    }
  }

  /**
   * 更新密码
   */
  static async updatePassword(userId, newPassword) {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    try {
      await pool.execute(
        'UPDATE st_users SET password = ?, updatedAt = ? WHERE id = ?',
        [hashedPassword, new Date().toISOString().slice(0, 19).replace('T', ' '), userId]
      );
      return true;
    } catch (error) {
      console.error('更新密码失败:', error);
      return false;
    }
  }

  /**
   * 验证密码
   */
  static async verifyPassword(password, hash) {
    return await bcrypt.compare(password, hash);
  }

  /**
   * 删除用户
   */
  static async delete(userId) {
    try {
      await pool.execute('DELETE FROM st_users WHERE id = ?', [userId]);
      return true;
    } catch (error) {
      console.error('删除用户失败:', error);
      return false;
    }
  }

  /**
   * 搜索用户
   */
  static async search(keyword, limit = 20) {
    try {
      // 检查是否直接匹配ID
      const [exactMatch] = await pool.execute(
        'SELECT id, username, nickname, avatar, isSVIP FROM st_users WHERE id = ? LIMIT 1',
        [keyword]
      );
      
      // 如果精确匹配到ID，直接返回
      if (exactMatch.length > 0) {
        return exactMatch;
      }
      
      // 否则按用户名或昵称模糊搜索
      const [rows] = await pool.execute(
        'SELECT id, username, nickname, avatar, isSVIP FROM st_users WHERE username LIKE ? OR nickname LIKE ? LIMIT ?',
        [`%${keyword}%`, `%${keyword}%`, limit]
      );
      return rows;
    } catch (error) {
      console.error('搜索用户失败:', error);
      return [];
    }
  }

  /**
   * 获取用户列表（管理员）
   */
  static async getAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_users ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM st_users');
      return {
        users: rows,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('获取用户列表失败:', error);
      return { users: [], total: 0 };
    }
  }

  /**
   * 设置用户管理员状态
   */
  static async setAdmin(userId, isAdmin) {
    try {
      await pool.execute('UPDATE st_users SET isAdmin = ? WHERE id = ?', [isAdmin, userId]);
      return true;
    } catch (error) {
      console.error('设置管理员失败:', error);
      return false;
    }
  }

  /**
   * 设置用户封禁状态
   */
  static async setBanned(userId, isBanned) {
    try {
      await pool.execute('UPDATE st_users SET isBanned = ? WHERE id = ?', [isBanned, userId]);
      return true;
    } catch (error) {
      console.error('设置封禁状态失败:', error);
      return false;
    }
  }

  /**
   * 设置用户SVIP状态
   */
  static async setSVIP(userId, isSVIP) {
    try {
      await pool.execute('UPDATE st_users SET isSVIP = ? WHERE id = ?', [isSVIP, userId]);
      return true;
    } catch (error) {
      console.error('设置SVIP状态失败:', error);
      return false;
    }
  }

  /**
   * 过滤用户敏感信息
   */
  static filterSensitiveInfo(user) {
    if (!user) return null;
    const { password, ...safeUser } = user;
    return safeUser;
  }
}

module.exports = User;