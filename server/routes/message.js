const express = require('express');
const router = express.Router();
const MessageController = require('../controllers/MessageController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/list', authenticateToken, MessageController.getList);
router.post('/send', authenticateToken, MessageController.send);
router.post('/read', authenticateToken, MessageController.markRead);
router.post('/recall', authenticateToken, MessageController.recall);

module.exports = router;
