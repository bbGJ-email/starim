const express = require('express');
const router = express.Router();
const MomentController = require('../controllers/MomentController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/publish', authenticateToken, MomentController.publish);
router.post('/list', authenticateToken, MomentController.getList);
router.post('/like', authenticateToken, MomentController.like);
router.post('/comment', authenticateToken, MomentController.comment);
router.post('/comments', authenticateToken, MomentController.getComments);
router.post('/delete', authenticateToken, MomentController.delete);

module.exports = router;
