const nodemailer = require('nodemailer');
const config = require('../config/app');

let transporter;

function getTransporter() {
  if (!config.smtp.host || !config.smtp.user || !config.smtp.pass) {
    throw new Error('SMTP配置不完整');
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass
      }
    });
  }

  return transporter;
}

async function sendEmailCode(email, code, purpose) {
  const subject = purpose === 'reset_password' ? '找回密码验证码' : '绑定邮箱验证码';
  const text = `您的${subject}是：${code}，请在${config.emailCode.expiresMinutes}分钟内使用。若非本人操作，请忽略本邮件。`;

  await getTransporter().sendMail({
    from: config.smtp.from,
    to: email,
    subject,
    text
  });
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = {
  sendEmailCode,
  normalizeEmail,
  isValidEmail
};
