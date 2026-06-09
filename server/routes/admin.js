const express = require('express');
const router = express.Router();
const AdminController = require('../controllers/AdminController');
const ReportController = require('../controllers/ReportController');
const PurchaseController = require('../controllers/PurchaseController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

// 所有admin接口都需要管理员权限
router.use(authenticateToken, requireAdmin);

router.post('/users', AdminController.getUsers);
router.post('/groups', AdminController.getGroups);
router.post('/messages', AdminController.getMessages);
router.post('/broadcast', AdminController.broadcast);
router.post('/toggleBan', AdminController.toggleBan);
router.post('/setAdmin', AdminController.setAdmin);
router.post('/setSVIP', AdminController.setSVIP);
router.post('/toggleGroupBan', AdminController.toggleGroupBan);
router.post('/delMsg', AdminController.deleteMessage);
router.post('/userIPs', AdminController.getUserIPs);
router.post('/banIP', AdminController.banIP);
router.post('/unbanIP', AdminController.unbanIP);
router.post('/bannedIPs', AdminController.getBannedIPs);
router.post('/stats', AdminController.getStats);

// 投诉处理
router.post('/handle', ReportController.handle);

// 购买管理
router.post('/purchases', PurchaseController.getList);
router.post('/purchase/approve', PurchaseController.approve);
router.post('/purchase/reject', PurchaseController.reject);

module.exports = router;
