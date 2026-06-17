const crypto = require('crypto');
const config = require('../config/app');
const { pool } = require('./db');

const MAX_ATTEMPTS = 5;

class EmailVerificationCode {
  static hashCode(email, purpose, code) {
    return crypto
      .createHash('sha256')
      .update(`${email}:${purpose}:${code}:${config.jwt.secret}`)
      .digest('hex');
  }

  static generateCode() {
    return String(Math.floor(100000 + Math.random() * 900000));
  }

  static async isCoolingDown(email, purpose, userId = null) {
    const params = [email, purpose];
    let userCondition = '';
    if (userId) {
      userCondition = 'AND userId = ?';
      params.push(userId);
    }

    const [rows] = await pool.execute(
      `SELECT createdAt FROM st_email_verification_codes
       WHERE email = ? AND purpose = ? ${userCondition}
       ORDER BY createdAt DESC LIMIT 1`,
      params
    );

    if (!rows[0]) return false;
    const elapsedMs = Date.now() - new Date(rows[0].createdAt).getTime();
    return elapsedMs < config.emailCode.cooldownSeconds * 1000;
  }

  static async create(email, purpose, code, ip, userId = null) {
    const expiresAt = new Date(Date.now() + config.emailCode.expiresMinutes * 60 * 1000)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    const codeHash = this.hashCode(email, purpose, code);

    await pool.execute(
      `INSERT INTO st_email_verification_codes (email, purpose, codeHash, expiresAt, ip, userId)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [email, purpose, codeHash, expiresAt, ip, userId]
    );
  }

  static async verify(email, purpose, code, userId = null) {
    const params = [email, purpose];
    let userCondition = '';
    if (userId) {
      userCondition = 'AND userId = ?';
      params.push(userId);
    }

    const [rows] = await pool.execute(
      `SELECT * FROM st_email_verification_codes
       WHERE email = ? AND purpose = ? AND used = false AND expiresAt > NOW() ${userCondition}
       ORDER BY createdAt DESC LIMIT 1`,
      params
    );

    const record = rows[0];
    if (!record) {
      return { ok: false, msg: '验证码无效或已过期' };
    }

    if (record.attempts >= MAX_ATTEMPTS) {
      return { ok: false, msg: '验证码尝试次数过多，请重新获取' };
    }

    const codeHash = this.hashCode(email, purpose, code);
    if (codeHash !== record.codeHash) {
      await pool.execute(
        'UPDATE st_email_verification_codes SET attempts = attempts + 1 WHERE id = ?',
        [record.id]
      );
      return { ok: false, msg: '验证码错误' };
    }

    await pool.execute(
      'UPDATE st_email_verification_codes SET used = true, usedAt = NOW() WHERE id = ?',
      [record.id]
    );

    return { ok: true, record };
  }
}

module.exports = EmailVerificationCode;
