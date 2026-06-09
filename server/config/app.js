// 应用配置文件
require('dotenv').config();

const corsOrigins = (process.env.CORS_ORIGINS || 'http://localhost:3004,http://127.0.0.1:3004,http://localhost:8080')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

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
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
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