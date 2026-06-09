const express = require('express');
const router = express.Router();
const GroupController = require('../controllers/GroupController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/list', authenticateToken, GroupController.getList);
router.post('/create', authenticateToken, GroupController.create);
router.post('/info', authenticateToken, GroupController.getInfo);
router.post('/manage', authenticateToken, GroupController.manage);
router.post('/join', authenticateToken, GroupController.join);
router.post('/card', authenticateToken, GroupController.getCard);

module.exports = router;
