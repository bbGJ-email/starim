const express = require('express');
const router = express.Router();
const UserController = require('../controllers/UserController');
const { authenticateToken } = require('../middlewares/auth');
const { identityLimiter, emailCodeLimiter } = require('../middlewares/rateLimit');

router.post('/status', authenticateToken, UserController.getStatus);
router.post('/info', authenticateToken, UserController.getInfo);
router.post('/search', authenticateToken, UserController.search);
router.post('/update', authenticateToken, UserController.update);
router.post('/updatePwd', authenticateToken, UserController.updatePassword);
router.post('/delete', authenticateToken, UserController.delete);
router.post('/self', authenticateToken, UserController.getSelf);
router.post('/referral-stats', authenticateToken, UserController.getReferralStats);
router.post('/real-name/status', authenticateToken, UserController.getRealNameStatus);
router.post('/real-name/submit', authenticateToken, identityLimiter, UserController.submitRealName);
router.post('/email/send-bind-code', authenticateToken, emailCodeLimiter, UserController.sendBindEmailCode);
router.post('/email/confirm-bind', authenticateToken, UserController.confirmBindEmail);
router.post('/stats', authenticateToken, UserController.getStats);

module.exports = router;
