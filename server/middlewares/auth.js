const jwt = require('jsonwebtoken');
const config = require('../config/app');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    console.log('auth middleware - token:', token ? 'exists' : 'missing');

    if (!token) {
      return res.status(401).json({ ok: false, msg: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, config.jwt.secret);
    console.log('auth middleware - decoded:', decoded);

    const user = await User.findById(decoded.id);
    console.log('auth middleware - user:', user ? 'found' : 'not found');

    if (!user) {
      return res.status(401).json({ ok: false, msg: '用户不存在' });
    }

    if (user.isBanned) {
      return res.status(403).json({ ok: false, msg: '账号已被封禁' });
    }

    req.user = user;
    console.log('auth middleware - req.user set:', req.user.id);
    next();
  } catch (error) {
    console.error('auth middleware error:', error.message);
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ ok: false, msg: '令牌已过期' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ ok: false, msg: '无效的令牌' });
    }
    return res.status(500).json({ ok: false, msg: '认证失败', error: error.message });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ ok: false, msg: '需要管理员权限' });
  }
  next();
};

const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, username: user.username },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
};

module.exports = {
  authenticateToken,
  requireAdmin,
  generateToken
};
