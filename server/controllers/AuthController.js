const User = require('../models/User');
const EmailVerificationCode = require('../models/EmailVerificationCode');
const { generateToken } = require('../middlewares/auth');
const { generateId, generateInvitationCode } = require('../utils/idGenerator');
const { getClientIP, recordRiskEvent } = require('../middlewares/ipBan');
const { sendEmailCode } = require('../utils/email');

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

class AuthController {
  static async register(req, res) {
    try {
      const { username, password, invitationCode } = req.body;

      if (!username || !password) {
        return res.json({ ok: false, msg: '用户名和密码不能为空' });
      }

      if (username.length < 3 || username.length > 20) {
        return res.json({ ok: false, msg: '用户名长度必须在3-20个字符之间' });
      }

      if (password.length < 6) {
        return res.json({ ok: false, msg: '密码长度至少为6个字符' });
      }

      const existingUser = await User.findByUsername(username);
      if (existingUser) {
        return res.json({ ok: false, msg: '用户名已存在' });
      }

      let referredBy = null;
      if (invitationCode) {
        const [rows] = await require('../models/db').pool.execute(
          'SELECT id FROM st_users WHERE invitationCode = ?',
          [invitationCode]
        );
        if (rows.length > 0) {
          referredBy = rows[0].id;
        }
      }

      const userId = generateId();
      const userInvitationCode = generateInvitationCode();
      const registerIP = getClientIP(req);

      const user = await User.create({
        id: userId,
        username,
        password,
        nickname: username,
        invitationCode: userInvitationCode,
        referredBy,
        registerIP
      });

      if (referredBy) {
        const [referredUsers] = await require('../models/db').pool.execute(
          'SELECT COUNT(*) as count FROM st_users WHERE referredBy = ?',
          [referredBy]
        );
        if (referredUsers[0].count >= 5) {
          await User.setSVIP(referredBy, true);
        }
      }

      const token = generateToken(user);

      res.json({
        ok: true,
        msg: '注册成功',
        token,
        user: User.filterSensitiveInfo(user)
      });
    } catch (error) {
      console.error('注册失败:', error);
      res.json({ ok: false, msg: '注册失败', error: error.message });
    }
  }

  static async login(req, res) {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.json({ ok: false, msg: '用户名和密码不能为空' });
      }

      const clientIP = getClientIP(req);
      const user = await User.findByUsername(username);
      if (!user) {
        recordRiskEvent(clientIP, 'login_failed', { reason: '登录失败过多' });
        return res.json({ ok: false, msg: '用户名或密码错误' });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        recordRiskEvent(clientIP, 'login_failed', { reason: '登录失败过多' });
        return res.json({ ok: false, msg: '用户名或密码错误' });
      }

      if (user.isBanned) {
        return res.json({ ok: false, msg: '账号已被封禁' });
      }

      const lastLoginIP = clientIP;
      await require('../models/db').pool.execute(
        'UPDATE st_users SET lastLoginIP = ? WHERE id = ?',
        [lastLoginIP, user.id]
      );

      const token = generateToken(user);

      res.json({
        ok: true,
        msg: '登录成功',
        token,
        user: User.filterSensitiveInfo(user)
      });
    } catch (error) {
      console.error('登录失败:', error);
      res.json({ ok: false, msg: '登录失败', error: error.message });
    }
  }

  static async sendResetPasswordCode(req, res) {
    const successMsg = '如果邮箱已绑定账号，验证码将发送到该邮箱';
    try {
      const email = normalizeEmail(req.body?.email);
      if (!isValidEmail(email)) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json({ ok: true, msg: successMsg });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.json({ ok: true, msg: successMsg });
      }

      const coolingDown = await EmailVerificationCode.isCoolingDown(email, 'reset_password');
      if (coolingDown) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json({ ok: true, msg: successMsg });
      }

      const code = EmailVerificationCode.generateCode();
      await EmailVerificationCode.create(email, 'reset_password', code, getClientIP(req), user.id);
      await sendEmailCode(email, code, 'reset_password');

      res.json({ ok: true, msg: successMsg });
    } catch (error) {
      console.error('发送找回密码验证码失败:', error);
      res.json({ ok: true, msg: successMsg });
    }
  }

  static async resetPassword(req, res) {
    try {
      const email = normalizeEmail(req.body?.email);
      const code = String(req.body?.code || '').trim();
      const newPassword = String(req.body?.newPassword || '').trim();

      if (!isValidEmail(email) || !code || !newPassword) {
        return res.json({ ok: false, msg: '邮箱、验证码和新密码不能为空' });
      }
      if (newPassword.length < 6) {
        return res.json({ ok: false, msg: '新密码长度至少为6个字符' });
      }

      const user = await User.findByEmail(email);
      if (!user) {
        return res.json({ ok: false, msg: '验证码无效或已过期' });
      }

      const result = await EmailVerificationCode.verify(email, 'reset_password', code, user.id);
      if (!result.ok) {
        recordRiskEvent(getClientIP(req), 'captcha_abuse', { reason: '验证码滥用过多' });
        return res.json(result);
      }

      const success = await User.updatePassword(user.id, newPassword);
      res.json({ ok: success, msg: success ? '密码重置成功，请重新登录' : '密码重置失败' });
    } catch (error) {
      console.error('重置密码失败:', error);
      res.json({ ok: false, msg: '重置密码失败', error: error.message });
    }
  }
}

module.exports = AuthController;
