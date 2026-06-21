const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');
const { authenticateToken } = require('../middlewares/auth');
const { enqueuePublicAccountModeration } = require('../utils/asyncContentModeration');

async function ensurePublicAccountTables(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS st_public_accounts (
      id VARCHAR(36) PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      avatar VARCHAR(255),
      ownerId VARCHAR(36) NOT NULL,
      followers JSON,
      createdAt DATETIME,
      moderationStatus VARCHAR(20) DEFAULT 'pending',
      isBlocked BOOLEAN DEFAULT false
    )
  `);
  await safeAddColumn(pool, 'st_public_accounts', 'description', 'TEXT');
  await safeAddColumn(pool, 'st_public_accounts', 'avatar', 'VARCHAR(255)');
  await safeAddColumn(pool, 'st_public_accounts', 'ownerId', 'VARCHAR(36)');
  await safeAddColumn(pool, 'st_public_accounts', 'followers', 'JSON');
  await safeAddColumn(pool, 'st_public_accounts', 'createdAt', 'DATETIME');
  await safeAddColumn(pool, 'st_public_accounts', 'moderationStatus', "VARCHAR(20) DEFAULT 'pending'");
  await safeAddColumn(pool, 'st_public_accounts', 'isBlocked', 'BOOLEAN DEFAULT false');
}

async function safeAddColumn(pool, table, column, columnDef) {
  try {
    await pool.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${columnDef}`);
  } catch (error) {
    if (error.code !== 'ER_DUP_FIELDNAME') {
      console.error(`添加列 ${table}.${column} 失败:`, error.message);
    }
  }
}

function parseFollowers(followers) {
  if (!followers) return [];
  if (Array.isArray(followers)) return followers;
  try {
    return JSON.parse(followers);
  } catch (e) {
    return [];
  }
}

function toPublicAccount(account, userId) {
  const followers = parseFollowers(account.followers);
  return {
    ...account,
    followers,
    followerCount: followers.length,
    subscribed: followers.includes(userId),
    isOwner: account.ownerId === userId
  };
}

// 图片代理（解决CORS和HTTP混合内容问题）
router.get('/image/proxy', (req, res) => {
  const imageUrl = req.query.url;
  if (!imageUrl) {
    return res.status(400).json({ ok: false, msg: '缺少图片URL' });
  }

  try {
    const parsedUrl = new URL(imageUrl);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;

    res.setHeader('Cache-Control', 'public, max-age=86400');

    protocol.get(imageUrl, (imageRes) => {
      res.setHeader('Content-Type', imageRes.headers['content-type'] || 'image/jpeg');
      imageRes.pipe(res);
    }).on('error', (err) => {
      res.status(500).json({ ok: false, msg: '获取图片失败', error: err.message });
    });
  } catch (error) {
    res.status(400).json({ ok: false, msg: '无效的URL' });
  }
});

// 隐私政策
router.get('/privacy-policy', (req, res) => {
  res.json({
    ok: true,
    content: `# 隐私政策

## 1. 信息收集
我们仅收集为提供服务所必需的信息，包括：
- 用户名、密码（加密存储）
- 头像、昵称等个人信息
- 聊天消息和朋友圈内容

## 2. 信息使用
您的信息仅用于：
- 提供即时通讯服务
- 用户身份验证
- 改进产品体验

## 3. 信息保护
- 所有密码使用 bcrypt 加密存储
- 通信使用HTTPS加密传输
- 严格的访问控制

## 4. 用户权利
您有权：
- 访问、修改、删除您的个人信息
- 注销账户
- 投诉违规行为

## 5. 联系我们
如有任何疑问，请联系管理员。`
  });
});

// 公众号列表
router.post('/public-account/list', authenticateToken, async (req, res) => {
  try {
    const { pool } = require('../models/db');
    await ensurePublicAccountTables(pool);

    const [rows] = await pool.execute('SELECT * FROM st_public_accounts ORDER BY createdAt DESC');
    res.json({ ok: true, data: rows.map((account) => toPublicAccount(account, req.user.id)) });
  } catch (error) {
    res.json({ ok: false, msg: '获取公众号列表失败', error: error.message });
  }
});

// 公众号详情
router.post('/public-account/detail', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.json({ ok: false, msg: '缺少公众号ID' });
    }

    const { pool } = require('../models/db');
    await ensurePublicAccountTables(pool);

    const [rows] = await pool.execute('SELECT * FROM st_public_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) {
      return res.json({ ok: false, msg: '公众号不存在' });
    }

    res.json({ ok: true, data: toPublicAccount(rows[0], req.user.id) });
  } catch (error) {
    res.json({ ok: false, msg: '获取公众号详情失败', error: error.message });
  }
});

// 公众号注册
router.post('/public-account/register', authenticateToken, async (req, res) => {
  try {
    const { name, description, avatar } = req.body;
    const { pool } = require('../models/db');
    const { generateId } = require('../utils/idGenerator');

    if (!name) {
      return res.json({ ok: false, msg: '公众号名称不能为空' });
    }

    await ensurePublicAccountTables(pool);

    const cleanName = String(name).trim();
    const cleanDescription = String(description || '').trim();
    const cleanAvatar = String(avatar || '').trim() || null;

    const [existingRows] = await pool.execute('SELECT id FROM st_public_accounts WHERE name = ? LIMIT 1', [cleanName]);
    if (existingRows[0]) {
      return res.json({ ok: false, msg: '公众号名称已存在' });
    }

    const id = generateId();
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await pool.execute(
      'INSERT INTO st_public_accounts (id, name, description, avatar, ownerId, followers, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, cleanName, cleanDescription, cleanAvatar, req.user.id, '[]', createdAt]
    );

    const [rows] = await pool.execute('SELECT * FROM st_public_accounts WHERE id = ? LIMIT 1', [id]);
    enqueuePublicAccountModeration({
      accountId: id,
      name: cleanName,
      description: cleanDescription,
      ownerId: req.user.id
    });
    res.json({ ok: true, msg: '公众号注册成功', data: toPublicAccount(rows[0], req.user.id), id });
  } catch (error) {
    res.json({ ok: false, msg: '注册失败', error: error.message });
  }
});

router.post('/public-account/subscribe', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.json({ ok: false, msg: '缺少公众号ID' });
    }

    const { pool } = require('../models/db');
    await ensurePublicAccountTables(pool);

    const [rows] = await pool.execute('SELECT * FROM st_public_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) {
      return res.json({ ok: false, msg: '公众号不存在' });
    }

    const followers = parseFollowers(rows[0].followers);
    if (!followers.includes(req.user.id)) {
      followers.push(req.user.id);
      await pool.execute('UPDATE st_public_accounts SET followers = ? WHERE id = ?', [JSON.stringify(followers), id]);
    }

    res.json({ ok: true, msg: '订阅成功' });
  } catch (error) {
    res.json({ ok: false, msg: '订阅失败', error: error.message });
  }
});

router.post('/public-account/unsubscribe', authenticateToken, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.json({ ok: false, msg: '缺少公众号ID' });
    }

    const { pool } = require('../models/db');
    await ensurePublicAccountTables(pool);

    const [rows] = await pool.execute('SELECT * FROM st_public_accounts WHERE id = ? LIMIT 1', [id]);
    if (!rows[0]) {
      return res.json({ ok: false, msg: '公众号不存在' });
    }

    const followers = parseFollowers(rows[0].followers).filter((userId) => userId !== req.user.id);
    await pool.execute('UPDATE st_public_accounts SET followers = ? WHERE id = ?', [JSON.stringify(followers), id]);

    res.json({ ok: true, msg: '已取消订阅' });
  } catch (error) {
    res.json({ ok: false, msg: '取消订阅失败', error: error.message });
  }
});

module.exports = router;
