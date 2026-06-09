const User = require('../models/User');
const { generateToken } = require('../middlewares/auth');
const { generateId, generateInvitationCode } = require('../utils/idGenerator');
const { getClientIP } = require('../middlewares/ipBan');

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

      const user = await User.findByUsername(username);
      if (!user) {
        return res.json({ ok: false, msg: '用户名或密码错误' });
      }

      const isPasswordValid = await User.verifyPassword(password, user.password);
      if (!isPasswordValid) {
        return res.json({ ok: false, msg: '用户名或密码错误' });
      }

      if (user.isBanned) {
        return res.json({ ok: false, msg: '账号已被封禁' });
      }

      const lastLoginIP = getClientIP(req);
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
}

module.exports = AuthController;
