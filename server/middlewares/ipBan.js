const { pool } = require('../models/db');

const tempBans = new Map();
const riskScores = new Map();

const RISK_POINTS = {
  login_failed: 15,
  captcha_abuse: 15,
  rate_limit: 20
};

const RISK_THRESHOLD = 150;
const SCORE_TTL_MS = 10 * 60 * 1000;
const DEFAULT_BAN_MS = 5 * 60 * 1000;

const getClientIP = (req) => {
  return req.ip ||
         req.connection.remoteAddress ||
         req.socket.remoteAddress;
};

function cleanupExpiredRisk(now = Date.now()) {
  for (const [ip, ban] of tempBans.entries()) {
    if (ban.expiresAt <= now) {
      tempBans.delete(ip);
    }
  }

  for (const [ip, score] of riskScores.entries()) {
    if (score.expiresAt <= now) {
      riskScores.delete(ip);
    }
  }
}

function getTempBan(ip) {
  cleanupExpiredRisk();
  return tempBans.get(ip) || null;
}

function banIPTemporarily(ip, reason, durationMs = DEFAULT_BAN_MS) {
  if (!ip) return;
  tempBans.set(ip, {
    reason,
    bannedAt: new Date(),
    expiresAt: Date.now() + durationMs
  });
}

function recordRiskEvent(ip, event, options = {}) {
  if (!ip) return;

  cleanupExpiredRisk();

  const points = options.points || RISK_POINTS[event] || 0;
  if (points <= 0) return;

  const now = Date.now();
  const current = riskScores.get(ip);
  const score = current && current.expiresAt > now ? current.score : 0;
  const nextScore = score + points;

  riskScores.set(ip, {
    score: nextScore,
    expiresAt: now + (options.windowMs || SCORE_TTL_MS)
  });

  if (nextScore >= (options.threshold || RISK_THRESHOLD)) {
    banIPTemporarily(ip, options.reason || `风险评分过高: ${event}`, options.banMs || DEFAULT_BAN_MS);
    riskScores.delete(ip);
  }
}

const checkBannedIP = async (req, res, next) => {
  try {
    const clientIP = getClientIP(req);
    const tempBan = getTempBan(clientIP);
    if (tempBan) {
      return res.status(403).json({
        ok: false,
        msg: '您的IP已被临时封禁',
        reason: tempBan.reason,
        expiresAt: new Date(tempBan.expiresAt).toISOString()
      });
    }

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
  checkBannedIP,
  recordRiskEvent,
  banIPTemporarily
};
