const express = require('express');
const router = express.Router();
const FeedbackController = require('../controllers/FeedbackController');
const { authenticateToken, requireAdmin } = require('../middlewares/auth');

router.post('/submit', authenticateToken, FeedbackController.submit);
router.get('/my', authenticateToken, FeedbackController.getMyList);
router.post('/detail', authenticateToken, FeedbackController.getDetail);
router.get('/list', authenticateToken, requireAdmin, FeedbackController.getAll);
router.post('/handle', authenticateToken, requireAdmin, FeedbackController.handle);
router.get('/stats', authenticateToken, requireAdmin, FeedbackController.getStats);

module.exports = router;