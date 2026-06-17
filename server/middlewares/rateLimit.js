const rateLimit = require('express-rate-limit');
const fs = require('fs');
const path = require('path');
const config = require('../config/app');
const { getClientIP, recordRiskEvent } = require('./ipBan');

let rateLimitConfig;
try {
  const configPath = path.join(__dirname, '../../', config.rateLimit.configPath);
  rateLimitConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (error) {
  console.error('读取速率限制配置文件失败，使用默认配置:', error);
  rateLimitConfig = { ignoredIps: ['127.0.0.1', '::1'] };
}

const createRateLimiter = (options = {}) => {
  const defaultOptions = {
    windowMs: config.rateLimit.defaultWindowMs,
    max: config.rateLimit.defaultMax,
    message: { ok: false, msg: '请求过于频繁，请稍后再试' },
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      const ip = getClientIP(req);
      return rateLimitConfig.ignoredIps && rateLimitConfig.ignoredIps.includes(ip);
    },
    handler: (req, res, next, opts) => {
      recordRiskEvent(getClientIP(req), 'rate_limit', { reason: '限流触发过多' });
      res.status(opts.statusCode).json(opts.message);
    }
  };

  return rateLimit({ ...defaultOptions, ...options });
};

const apiLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const authLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, msg: '登录尝试次数过多，请15分钟后再试' }
});

const uploadLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { ok: false, msg: '上传次数过多，请1小时后再试' }
});

const identityLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { ok: false, msg: '实名认证尝试次数过多，请稍后再试' }
});

const emailCodeLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, msg: '验证码请求过于频繁，请稍后再试' }
});

module.exports = {
  createRateLimiter,
  apiLimiter,
  authLimiter,
  uploadLimiter,
  identityLimiter,
  emailCodeLimiter
};
