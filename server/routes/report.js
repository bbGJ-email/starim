const express = require('express');
const router = express.Router();
const ReportController = require('../controllers/ReportController');
const { authenticateToken } = require('../middlewares/auth');

router.post('/submit', authenticateToken, ReportController.submit);
router.get('/my', authenticateToken, ReportController.getMy);
router.get('/list', authenticateToken, ReportController.getList);

module.exports = router;
