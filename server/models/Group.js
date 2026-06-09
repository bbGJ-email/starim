const { pool } = require('./db');

class Group {
  /**
   * 创建群组
   */
  static async create(groupData) {
    const {
      id,
      name,
      type = 'public',
      creatorId,
      avatar = null,
      announcement = ''
    } = groupData;

    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const members = JSON.stringify([creatorId]);
    const admins = JSON.stringify([creatorId]);
    const mutedMembers = JSON.stringify([]);

    try {
      await pool.execute(
        `INSERT INTO st_groups 
        (id, name, type, creatorId, members, admins, announcement, mutedMembers, avatar, isBanned, createdAt) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, false, ?)`,
        [id, name, type, creatorId, members, admins, announcement, mutedMembers, avatar, createdAt]
      );

      // 添加创建者为群成员
      await pool.execute(
        'INSERT INTO st_group_members (groupId, userId, joinTime) VALUES (?, ?, ?)',
        [id, creatorId, createdAt]
      );

      return await this.findById(id);
    } catch (error) {
      console.error('创建群组失败:', error);
      throw error;
    }
  }

  /**
   * 根据ID获取群组
   */
  static async findById(groupId) {
    try {
      const [rows] = await pool.execute('SELECT * FROM st_groups WHERE id = ?', [groupId]);
      const group = rows[0] || null;
      
      if (group) {
        // 解析JSON字段
        if (typeof group.members === 'string') {
          try { group.members = JSON.parse(group.members); } catch (e) { group.members = []; }
        }
        if (typeof group.admins === 'string') {
          try { group.admins = JSON.parse(group.admins); } catch (e) { group.admins = []; }
        }
        if (typeof group.mutedMembers === 'string') {
          try { group.mutedMembers = JSON.parse(group.mutedMembers); } catch (e) { group.mutedMembers = []; }
        }
      }
      
      return group;
    } catch (error) {
      console.error('查询群组失败:', error);
      return null;
    }
  }

  /**
   * 获取用户所在的群组列表
   */
  static async getUserGroups(userId) {
    try {
      const [rows] = await pool.execute(
        `SELECT g.* FROM st_groups g
         JOIN st_group_members gm ON g.id = gm.groupId
         WHERE gm.userId = ? AND g.isBanned = false
         ORDER BY g.createdAt DESC`,
        [userId]
      );
      
      // 解析JSON字段
      return rows.map(group => {
        if (typeof group.members === 'string') {
          try { group.members = JSON.parse(group.members); } catch (e) { group.members = []; }
        }
        if (typeof group.admins === 'string') {
          try { group.admins = JSON.parse(group.admins); } catch (e) { group.admins = []; }
        }
        if (typeof group.mutedMembers === 'string') {
          try { group.mutedMembers = JSON.parse(group.mutedMembers); } catch (e) { group.mutedMembers = []; }
        }
        return group;
      });
    } catch (error) {
      console.error('获取用户群组列表失败:', error);
      return [];
    }
  }

  /**
   * 获取群组成员ID列表
   */
  static async getMembers(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT userId FROM st_group_members WHERE groupId = ?',
        [groupId]
      );
      return rows.map(row => row.userId);
    } catch (error) {
      console.error('获取群组成员失败:', error);
      return [];
    }
  }

  /**
   * 添加成员
   */
  static async addMember(groupId, userId) {
    try {
      const joinTime = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await pool.execute(
        'INSERT INTO st_group_members (groupId, userId, joinTime) VALUES (?, ?, ?)',
        [groupId, userId, joinTime]
      );

      // 更新群组的members字段
      const group = await this.findById(groupId);
      if (group && !group.members.includes(userId)) {
        group.members.push(userId);
        await pool.execute(
          'UPDATE st_groups SET members = ? WHERE id = ?',
          [JSON.stringify(group.members), groupId]
        );
      }

      return true;
    } catch (error) {
      console.error('添加群成员失败:', error);
      return false;
    }
  }

  /**
   * 移除成员
   */
  static async removeMember(groupId, userId) {
    try {
      await pool.execute(
        'DELETE FROM st_group_members WHERE groupId = ? AND userId = ?',
        [groupId, userId]
      );

      // 更新群组的members字段
      const group = await this.findById(groupId);
      if (group) {
        group.members = group.members.filter(id => id !== userId);
        group.admins = group.admins.filter(id => id !== userId);
        group.mutedMembers = group.mutedMembers.filter(id => id !== userId);
        
        await pool.execute(
          'UPDATE st_groups SET members = ?, admins = ?, mutedMembers = ? WHERE id = ?',
          [JSON.stringify(group.members), JSON.stringify(group.admins), JSON.stringify(group.mutedMembers), groupId]
        );
      }

      return true;
    } catch (error) {
      console.error('移除群成员失败:', error);
      return false;
    }
  }

  /**
   * 更新群组信息
   */
  static async update(groupId, updates) {
    const allowedFields = ['name', 'announcement', 'avatar', 'members', 'admins', 'mutedMembers'];
    const fields = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        // JSON字段需要序列化
        if (['members', 'admins', 'mutedMembers'].includes(key)) {
          values.push(JSON.stringify(value));
        } else {
          values.push(value);
        }
      }
    }

    if (fields.length === 0) {
      return false;
    }

    values.push(groupId);

    try {
      await pool.execute(
        `UPDATE st_groups SET ${fields.join(', ')} WHERE id = ?`,
        values
      );
      return true;
    } catch (error) {
      console.error('更新群组失败:', error);
      return false;
    }
  }

  /**
   * 删除群组
   */
  static async delete(groupId) {
    try {
      await pool.execute('DELETE FROM st_group_members WHERE groupId = ?', [groupId]);
      await pool.execute('DELETE FROM st_groups WHERE id = ?', [groupId]);
      return true;
    } catch (error) {
      console.error('删除群组失败:', error);
      return false;
    }
  }

  /**
   * 设置群组封禁状态
   */
  static async setBanned(groupId, isBanned) {
    try {
      await pool.execute('UPDATE st_groups SET isBanned = ? WHERE id = ?', [isBanned, groupId]);
      return true;
    } catch (error) {
      console.error('设置群组封禁状态失败:', error);
      return false;
    }
  }

  /**
   * 获取所有群组（管理员）
   */
  static async getAll(page = 1, size = 20) {
    const offset = (page - 1) * size;
    try {
      const [rows] = await pool.execute(
        'SELECT * FROM st_groups ORDER BY createdAt DESC LIMIT ? OFFSET ?',
        [size, offset]
      );
      const [countResult] = await pool.execute('SELECT COUNT(*) as total FROM st_groups');
      
      // 解析JSON字段
      const groups = rows.map(group => {
        if (typeof group.members === 'string') {
          try { group.members = JSON.parse(group.members); } catch (e) { group.members = []; }
        }
        if (typeof group.admins === 'string') {
          try { group.admins = JSON.parse(group.admins); } catch (e) { group.admins = []; }
        }
        if (typeof group.mutedMembers === 'string') {
          try { group.mutedMembers = JSON.parse(group.mutedMembers); } catch (e) { group.mutedMembers = []; }
        }
        return group;
      });
      
      return {
        groups,
        total: countResult[0].total
      };
    } catch (error) {
      console.error('获取群组列表失败:', error);
      return { groups: [], total: 0 };
    }
  }

  /**
   * 获取群组成员数量
   */
  static async getMemberCount(groupId) {
    try {
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM st_group_members WHERE groupId = ?',
        [groupId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('获取群组成员数量失败:', error);
      return 0;
    }
  }
}

module.exports = Group;
