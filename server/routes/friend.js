const express = require('express');
const router = express.Router();
const FriendController = require('../controllers/FriendController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/list', authenticateToken, FriendController.getList);
router.post('/add', authenticateToken, FriendController.add);
router.post('/delete', authenticateToken, FriendController.delete);
router.post('/requests', authenticateToken, FriendController.getRequests);
router.post('/accept', authenticateToken, FriendController.accept);
router.post('/reject', authenticateToken, FriendController.reject);

module.exports = router;
