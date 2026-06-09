const express = require('express');
const router = express.Router();
const https = require('https');
const http = require('http');
const { URL } = require('url');

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

// 公众号注册
router.post('/public-account/register', async (req, res) => {
  try {
    const { name, description, avatar, ownerId } = req.body;
    const { pool } = require('../models/db');
    const { generateId } = require('../utils/idGenerator');

    if (!name || !ownerId) {
      return res.json({ ok: false, msg: '参数不完整' });
    }

    await pool.execute(`
      CREATE TABLE IF NOT EXISTS st_public_accounts (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        description TEXT,
        avatar VARCHAR(255),
        ownerId VARCHAR(36) NOT NULL,
        followers JSON,
        createdAt DATETIME
      )
    `);

    const id = generateId();
    const createdAt = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      'INSERT INTO st_public_accounts (id, name, description, avatar, ownerId, followers, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [id, name, description || '', avatar || null, ownerId, '[]', createdAt]
    );

    res.json({ ok: true, msg: '公众号注册成功', id });
  } catch (error) {
    res.json({ ok: false, msg: '注册失败', error: error.message });
  }
});

module.exports = router;
