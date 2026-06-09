const mysql = require('mysql2/promise');
const appConfig = require('../config/app');

const config = {
  host: appConfig.database.host,
  user: appConfig.database.user,
  password: appConfig.database.password,
  database: appConfig.database.database,
  port: appConfig.database.port,
  waitForConnections: appConfig.database.waitForConnections,
  connectionLimit: appConfig.database.connectionLimit,
  queueLimit: appConfig.database.queueLimit
};

const pool = mysql.createPool(config);

async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ 数据库连接成功');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ 数据库连接失败:', error);
    return false;
  }
}

async function getTableSchema(tableName) {
  try {
    const [rows] = await pool.execute(
      `SELECT COLUMN_NAME, DATA_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
      [config.database, tableName]
    );
    return rows;
  } catch (e) {
    return [];
  }
}

async function dropForeignKeys(tableName) {
  try {
    const [rows] = await pool.execute(
      `SELECT CONSTRAINT_NAME FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
      [config.database, tableName]
    );
    for (const row of rows) {
      await pool.execute(`ALTER TABLE ${tableName} DROP FOREIGN KEY ${row.CONSTRAINT_NAME}`);
      console.log(`✅ 删除外键 ${row.CONSTRAINT_NAME}`);
    }
  } catch (e) {
    console.log('ℹ️ 删除外键时出错:', e.message);
  }
}

async function safeAddColumn(table, column, columnDef) {
  try {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef}`);
    console.log(`✅ 添加列 ${table}.${column} 成功`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log(`ℹ️ 列 ${table}.${column} 已存在，跳过`);
    } else if (error.code === 'ER_BAD_FIELD_ERROR') {
      console.log(`ℹ️ 列 ${table}.${column} 已存在或其他错误: ${error.message}`);
    } else {
      console.error(`❌ 添加列 ${table}.${column} 失败:`, error.message);
    }
  }
}

async function modifyColumnType(table, column, newType) {
  try {
    await pool.execute(`ALTER TABLE ${table} MODIFY COLUMN ${column} ${newType}`);
    console.log(`✅ 修改列 ${table}.${column} 类型为 ${newType} 成功`);
  } catch (error) {
    console.error(`❌ 修改列 ${table}.${column} 失败:`, error.message);
  }
}

async function dropColumn(table, column) {
  try {
    await pool.execute(`ALTER TABLE ${table} DROP COLUMN ${column}`);
    console.log(`✅ 删除列 ${table}.${column}`);
  } catch (error) {
    console.error(`❌ 删除列 ${table}.${column} 失败:`, error.message);
  }
}

async function initTables() {
  try {
    // 创建用户表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_users (
        id VARCHAR(36) PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        nickname VARCHAR(50),
        avatar VARCHAR(255),
        friendVerification BOOLEAN DEFAULT true,
        desktopNotifications BOOLEAN DEFAULT true,
        soundNotifications BOOLEAN DEFAULT true,
        isAdmin BOOLEAN DEFAULT false,
        isBanned BOOLEAN DEFAULT false,
        isSVIP BOOLEAN DEFAULT false,
        registerIP VARCHAR(45),
        lastLoginIP VARCHAR(45),
        invitationCode VARCHAR(20),
        referredBy VARCHAR(36),
        createdAt DATETIME,
        updatedAt DATETIME,
        signature TEXT,
        email VARCHAR(100),
        phone VARCHAR(20)
      )
    `);

    // 添加缺失的列到 st_users
    await safeAddColumn('st_users', 'signature', 'TEXT');
    await safeAddColumn('st_users', 'email', 'VARCHAR(100)');
    await safeAddColumn('st_users', 'phone', 'VARCHAR(20)');
    await safeAddColumn('st_users', 'updatedAt', 'DATETIME');
    await safeAddColumn('st_users', 'createdAt', 'DATETIME');

    // 创建消息表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_messages (
        id VARCHAR(36) PRIMARY KEY,
        senderId VARCHAR(36) NOT NULL,
        receiverId VARCHAR(36),
        groupId VARCHAR(36),
        content TEXT NOT NULL,
        type VARCHAR(20) DEFAULT 'text',
        fileName VARCHAR(255),
        timestamp DATETIME,
        quotedMessage JSON,
        cardUser JSON,
        cardGroup JSON,
        \`read\` BOOLEAN DEFAULT false,
        isRecalled BOOLEAN DEFAULT false
      )
    `);

    // 创建群组表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_groups (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        type VARCHAR(20) DEFAULT 'public',
        creatorId VARCHAR(36) NOT NULL,
        members JSON,
        admins JSON,
        announcement TEXT,
        mutedMembers JSON,
        avatar VARCHAR(255),
        isBanned BOOLEAN DEFAULT false,
        createdAt DATETIME
      )
    `);

    // 创建群组成员表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_group_members (
        id VARCHAR(36) PRIMARY KEY,
        groupId VARCHAR(36) NOT NULL,
        userId VARCHAR(36) NOT NULL,
        joinTime DATETIME,
        UNIQUE KEY unique_group_member (groupId, userId)
      )
    `);

    // 创建好友关系表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_friends (
        id VARCHAR(36) PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        friendId VARCHAR(36) NOT NULL,
        status VARCHAR(20) DEFAULT 'pending',
        createdAt DATETIME,
        UNIQUE KEY unique_friendship (userId, friendId)
      )
    `);

    // 创建动态表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS moments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        images JSON,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 检查 moments 表的现有结构并进行必要的迁移
    const momentsSchema = await getTableSchema('moments');
    if (momentsSchema.length > 0) {
      console.log('moments 表结构:', momentsSchema);

      // 删除 moments 表的旧外键约束
      await dropForeignKeys('moments');

      // 如果存在旧的 user_id 列，尝试重命名
      const userIdCol2 = momentsSchema.find(c => c.COLUMN_NAME === 'user_id');
      if (userIdCol2) {
        try {
          await pool.execute('ALTER TABLE moments CHANGE COLUMN user_id userId VARCHAR(36) NOT NULL');
          console.log('✅ 重命名 user_id 为 userId');
        } catch (e) {
          console.log('ℹ️ 重命名列时出错:', e.message);
        }
      }
    }

    // 创建动态点赞表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS moment_likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        momentId INT NOT NULL,
        userId VARCHAR(36) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_like (momentId, userId)
      )
    `);

    // 创建动态评论表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS moment_comments (
        id INT AUTO_INCREMENT PRIMARY KEY,
        momentId INT NOT NULL,
        userId VARCHAR(36) NOT NULL,
        content TEXT NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建举报表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS reports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        reporterId VARCHAR(36) NOT NULL,
        targetId VARCHAR(36) NOT NULL,
        type ENUM('spam', 'abuse', 'porn', 'other') DEFAULT 'other',
        content TEXT NOT NULL,
        status ENUM('pending', 'resolved') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建购买申请表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_purchases (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL,
        type ENUM('source', 'svip') NOT NULL,
        details JSON NOT NULL,
        paymentProof VARCHAR(255) NOT NULL,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    // 创建IP封禁表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_bannedIPs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        ip VARCHAR(45) NOT NULL,
        reason VARCHAR(255),
        bannedBy VARCHAR(36),
        bannedAt DATETIME,
        expiresAt DATETIME,
        UNIQUE KEY unique_ip (ip)
      )
    `);

    // 创建反馈表
    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_feedbacks (
        id INT AUTO_INCREMENT PRIMARY KEY,
        userId VARCHAR(36) NOT NULL,
        type ENUM('bug', 'feature', 'suggestion', 'other') DEFAULT 'other',
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        screenshots JSON,
        status ENUM('pending', 'processing', 'resolved', 'rejected') DEFAULT 'pending',
        reply TEXT,
        createdAt DATETIME,
        updatedAt DATETIME
      )
    `);

    console.log('✅ 数据库表初始化完成');
  } catch (error) {
    console.error('❌ 数据库表初始化失败:', error);
  }
}

module.exports = {
  pool,
  testConnection,
  initTables
};