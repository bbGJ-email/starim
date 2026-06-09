const express = require('express');
const router = express.Router();

const authRoutes = require('./auth');
const userRoutes = require('./user');
const messageRoutes = require('./message');
const friendRoutes = require('./friend');
const groupRoutes = require('./group');
const momentRoutes = require('./moment');
const reportRoutes = require('./report');
const feedbackRoutes = require('./feedback');
const adminRoutes = require('./admin');
const purchaseRoutes = require('./purchase');
const miscRoutes = require('./misc');

// 注册所有路由
router.use('/', authRoutes); // /api/register, /api/login
router.use('/user', userRoutes);
router.use('/message', messageRoutes);
router.use('/friend', friendRoutes);
router.use('/group', groupRoutes);
router.use('/moment', momentRoutes);
router.use('/report', reportRoutes);
router.use('/feedback', feedbackRoutes);
router.use('/admin', adminRoutes);
router.use('/purchase', purchaseRoutes);
router.use('/', miscRoutes); // /api/image/proxy, /api/privacy-policy 等

module.exports = router;
