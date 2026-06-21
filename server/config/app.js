// 应用配置文件
require('dotenv').config();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3004,http://127.0.0.1:3004,http://localhost:8080')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

const uploadAllowedMimeTypes = (process.env.UPLOAD_ALLOWED_MIME_TYPES || 'image/jpeg,image/jpg,image/png,image/gif')
  .split(',')
  .map(type => type.trim())
  .filter(Boolean);

const uploadAllowedExtensions = (process.env.UPLOAD_ALLOWED_EXTENSIONS || '.jpg,.jpeg,.png,.gif')
  .split(',')
  .map(ext => ext.trim().toLowerCase())
  .filter(Boolean);

const trustProxy = process.env.TRUST_PROXY || 'loopback';

const requiredEnv = ['JWT_SECRET', 'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingEnv = requiredEnv.filter(key => !process.env[key]);
if (missingEnv.length > 0) {
  throw new Error(`缺少必要环境变量: ${missingEnv.join(', ')}`);
}

module.exports = {
  // JWT配置
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },

  // MySQL数据库配置
  database: {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: Number(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
    queueLimit: 0,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT || 10000),
    charset: 'utf8mb4'
  },

  // 上传文件配置
  upload: {
    dir: process.env.UPLOAD_DIR || 'uploads',
    maxFileSize: Number(process.env.UPLOAD_MAX_FILE_SIZE || 5 * 1024 * 1024),
    allowedTypes: uploadAllowedMimeTypes,
    allowedExtensions: uploadAllowedExtensions,
    enableClamAV: process.env.UPLOAD_ENABLE_CLAMAV === 'true',
    clamAV: {
      host: process.env.CLAMAV_HOST || '127.0.0.1',
      port: Number(process.env.CLAMAV_PORT || 3310)
    }
  },

  security: {
    messageRecallWindowSeconds: Number(process.env.MESSAGE_RECALL_WINDOW_SECONDS || 120)
  },

  // 实名认证配置
  identityAuth: {
    url: process.env.IDENTITY_AUTH_URL || ''
  },

  // SMTP邮件配置
  smtp: {
    host: process.env.SMTP_HOST || '',
    port: Number(process.env.SMTP_PORT || 465),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || ''
  },

  // 邮箱验证码配置
  emailCode: {
    expiresMinutes: Number(process.env.EMAIL_CODE_EXPIRES_MINUTES || 10),
    cooldownSeconds: Number(process.env.EMAIL_CODE_COOLDOWN_SECONDS || 60)
  },

  // 消息配置
  message: {
    recallWindowSeconds: Number(process.env.MESSAGE_RECALL_WINDOW_SECONDS || 120)
  },

  // 敏感内容审核配置
  contentModeration: {
    ai: {
      endpoint: process.env.CONTENT_MODERATION_AI_ENDPOINT || '',
      key: process.env.CONTENT_MODERATION_AI_KEY || '',
      model: process.env.CONTENT_MODERATION_AI_MODEL || ''
    },
    externalFilter: {
      endpoint: process.env.CONTENT_MODERATION_EXTERNAL_API_ENDPOINT || '',
      token: process.env.CONTENT_MODERATION_EXTERNAL_API_TOKEN || ''
    },
    timeoutMs: Number(process.env.CONTENT_MODERATION_TIMEOUT_MS || 5000),
    blockedText: process.env.CONTENT_MODERATION_BLOCKED_TEXT || '检测到敏感内容，已自动屏蔽'
  },

  // Socket配置
  socket: {
    pingInterval: 25000,
    pingTimeout: 60000,
    maxHttpBufferSize: 1e8
  },

  // 限流配置
  rateLimit: {
    configPath: 'rateLimitConfig.json',
    defaultWindowMs: 15 * 60 * 1000, // 15分钟
    defaultMax: 100 // 最大请求数
  },

  // 服务器配置
  server: {
    port: process.env.PORT || 3004,
    trustProxy,
    cors: {
      origin: corsOrigins,
      credentials: true
    }
  },

  // 敏感词文件路径
  sensitiveWordsPath: 'data/sensitive_words.json',

  // 数据存储路径（用于文件系统存储）
  dataDir: 'data'
};