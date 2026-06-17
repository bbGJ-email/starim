const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/AuthController');
const { authLimiter, emailCodeLimiter } = require('../middlewares/rateLimit');

router.post('/register', AuthController.register);
router.post('/login', authLimiter, AuthController.login);
router.post('/password/send-reset-code', emailCodeLimiter, AuthController.sendResetPasswordCode);
router.post('/password/reset', authLimiter, AuthController.resetPassword);

module.exports = router;
