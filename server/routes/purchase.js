const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const net = require('net');
const config = require('../config/app');
const PurchaseController = require('../controllers/PurchaseController');

const uploadDir = path.join(__dirname, '../../', config.upload.dir);
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const paymentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, 'payment-proof-' + uniqueSuffix + ext);
  }
});

function isAllowedUpload(file) {
  const ext = path.extname(file.originalname).toLowerCase();
  return config.upload.allowedTypes.includes(file.mimetype) &&
    config.upload.allowedExtensions.includes(ext);
}

const paymentUpload = multer({
  storage: paymentStorage,
  limits: {
    fileSize: config.upload.maxFileSize
  },
  fileFilter: (req, file, cb) => {
    if (isAllowedUpload(file)) {
      cb(null, true);
    } else {
      cb(new Error('文件类型不允许'), false);
    }
  }
});

function clamAVCommand(command) {
  return new Promise((resolve, reject) => {
    const socket = net.createConnection(config.upload.clamAV.port, config.upload.clamAV.host);
    let response = '';

    socket.setTimeout(10000);
    socket.on('connect', () => socket.write(command));
    socket.on('data', data => { response += data.toString(); });
    socket.on('end', () => resolve(response));
    socket.on('timeout', () => {
      socket.destroy();
      reject(new Error('ClamAV扫描超时'));
    });
    socket.on('error', reject);
  });
}

async function scanWithClamAV(filePath) {
  const normalizedPath = path.resolve(filePath).replace(/\\/g, '/');
  const response = await clamAVCommand(`SCAN ${normalizedPath}\n`);
  if (response.includes('FOUND')) {
    throw new Error('文件未通过病毒扫描');
  }
  if (!response.includes('OK')) {
    throw new Error('ClamAV扫描失败');
  }
}

async function scanUploadedFile(req, res, next) {
  if (!config.upload.enableClamAV || !req.file) {
    return next();
  }

  try {
    await scanWithClamAV(req.file.path);
    next();
  } catch (error) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ ok: false, msg: error.message });
  }
}

function handleUpload(req, res, next) {
  paymentUpload.single('paymentProof')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ ok: false, msg: '文件大小超过限制' });
    }

    return res.status(400).json({ ok: false, msg: error.message || '上传失败' });
  });
}

router.post('/submit', handleUpload, scanUploadedFile, PurchaseController.submit);

module.exports = router;
