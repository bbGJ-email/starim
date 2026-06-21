#!/usr/bin/env node

/**
 * 星智IM 后端服务器
 * 重构版本 - 模块化架构
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const fs = require('fs');
const http = require('http');
const { Server } = require('socket.io');

const config = require('./config/app');
const { testConnection, initTables } = require('./models/db');
const apiRoutes = require('./routes');
const { errorHandler, notFoundHandler } = require('./middlewares/errorHandler');
const { checkBannedIP } = require('./middlewares/ipBan');
const { apiLimiter } = require('./middlewares/rateLimit');
const { initSocketHandlers } = require('./socket/handlers');
const { onlineUsers } = require('./utils/onlineUsers');

// 创建Express应用
const app = express();
app.set('trust proxy', config.server.trustProxy);
const server = http.createServer(app);

// 创建Socket.IO实例
const io = new Server(server, {
  cors: config.server.cors,
  pingInterval: config.socket.pingInterval,
  pingTimeout: config.socket.pingTimeout,
  maxHttpBufferSize: config.socket.maxHttpBufferSize
});

// 把io实例挂在app上，方便controllers使用
app.set('io', io);

// 把onlineUsers挂在app上，方便controllers使用
app.set('onlineUsers', onlineUsers);

// ==================== 中间件配置 ====================

// 安全相关
app.use(helmet({
  contentSecurityPolicy: false
}));

// CORS
app.use(cors(config.server.cors));

// 请求体解析
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

// 前端静态文件
app.use(express.static(path.join(__dirname, '..')));

// IP封禁检查（在API路由之前）
app.use('/api', checkBannedIP);
app.use('/api', apiLimiter);

// ==================== 路由配置 ====================

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    ok: true,
    msg: 'Service is running',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});

// API路由
app.use('/api', apiRoutes);

// ==================== 错误处理 ====================

// 404处理
app.use('/api/', notFoundHandler);

// 全局错误处理（必须放在最后）
app.use(errorHandler);

// ==================== Socket.IO 初始化 ====================

initSocketHandlers(io);

// ==================== 启动服务器 ====================

async function startServer() {
  try {
    // 测试数据库连接
    const dbConnected = await testConnection();
    if (!dbConnected) {
      console.error('❌ 无法连接到数据库，服务器启动失败');
      process.exit(1);
    }

    // 初始化数据库表
    await initTables();

    // 启动服务器
    const PORT = config.server.port;
    server.listen(PORT, () => {
      console.log('=================================================');
      console.log('  ⭐ 星智IM 服务器启动成功');
      console.log('=================================================');
      console.log(`  🌐 服务地址: http://localhost:${PORT}`);
      console.log(`  💾 数据库: ${config.database.host}/${config.database.database}`);
      console.log(`  🔧 环境: ${process.env.NODE_ENV || 'development'}`);
      console.log(`  📅 启动时间: ${new Date().toLocaleString('zh-CN')}`);
      console.log('=================================================');
    });
  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 优雅关闭
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

function gracefulShutdown() {
  console.log('\n📛 正在关闭服务器...');
  server.close(() => {
    console.log('✅ 服务器已关闭');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('⚠️ 强制退出');
    process.exit(1);
  }, 10000);
}

// 处理未捕获的异常
process.on('uncaughtException', (err) => {
  console.error('未捕获的异常:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('未处理的Promise拒绝:', reason);
});

// 启动服务器
startServer();

module.exports = { app, server, io };