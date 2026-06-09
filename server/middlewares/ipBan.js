const { pool } = require('../models/db');

const getClientIP = (req) => {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress ||
         req.ip;
};

const checkBannedIP = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    
    const [rows] = await pool.execute(
      'SELECT * FROM st_bannedIPs WHERE ip = ?',
      [clientIP]
    );

    if (rows.length > 0) {
      const ban = rows[0];
      const expiresAt = ban.expiresAt || ban.expires_at;
      if (!expiresAt || new Date(expiresAt) > new Date()) {
        return res.status(403).json({
          ok: false,
          msg: '您的IP已被封禁',
          reason: ban.reason,
          expiresAt: expiresAt
        });
      }
    }

    req.clientIP = clientIP;
    next();
  } catch (error) {
    console.error('检查IP封禁失败:', error);
    next();
  }
};

module.exports = {
  getClientIP,
  checkBannedIP
};
