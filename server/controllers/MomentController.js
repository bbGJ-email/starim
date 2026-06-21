const Moment = require('../models/Moment');
const User = require('../models/User');
const { enqueueMomentModeration, enqueueMomentCommentModeration } = require('../utils/asyncContentModeration');

class MomentController {
  static async publish(req, res) {
    try {
      const { content } = req.body;
      if (!content || content.trim().length === 0) {
        return res.json({ ok: false, msg: '内容不能为空' });
      }

      const momentId = await Moment.create({
        userId: req.user.id,
        content
      });

      const moment = await Moment.findById(momentId);
      moment.user = User.filterSensitiveInfo(req.user);

      enqueueMomentModeration({
        momentId,
        content,
        userId: req.user.id
      });

      res.json({ ok: true, msg: '发布成功', moment });
    } catch (error) {
      res.json({ ok: false, msg: '发布失败', error: error.message });
    }
  }

  static async getList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 20;
      const moments = await Moment.findAll(page, size);
      res.json({ ok: true, data: moments });
    } catch (error) {
      res.json({ ok: false, msg: '获取列表失败', error: error.message });
    }
  }

  static async like(req, res) {
    try {
      const { momentId } = req.body;
      if (!momentId) {
        return res.json({ ok: false, msg: '缺少朋友圈ID' });
      }

      const success = await Moment.like(momentId, req.user.id);
      res.json({ ok: success, msg: success ? '点赞成功' : '点赞失败' });
    } catch (error) {
      res.json({ ok: false, msg: '点赞失败', error: error.message });
    }
  }

  static async comment(req, res) {
    try {
      const { momentId, content } = req.body;
      if (!momentId || !content) {
        return res.json({ ok: false, msg: '参数不完整' });
      }

      const success = await Moment.comment(momentId, req.user.id, content);
      if (success) {
        enqueueMomentCommentModeration({
          commentId: success,
          momentId,
          content,
          userId: req.user.id
        });
      }
      res.json({ ok: success, msg: success ? '评论成功' : '评论失败' });
    } catch (error) {
      res.json({ ok: false, msg: '评论失败', error: error.message });
    }
  }

  static async getComments(req, res) {
    try {
      const { momentId } = req.body;
      const moment = await Moment.findById(momentId);
      if (!moment) {
        return res.json({ ok: false, msg: '朋友圈不存在' });
      }

      // 附加评论用户信息
      const comments = [];
      for (const c of moment.comments) {
        const user = await User.findById(c.userId);
        comments.push({
          ...c,
          user: user ? User.filterSensitiveInfo(user) : null
        });
      }

      res.json({ ok: true, data: comments });
    } catch (error) {
      res.json({ ok: false, msg: '获取评论失败', error: error.message });
    }
  }

  static async delete(req, res) {
    try {
      const { momentId } = req.body;
      const moment = await Moment.findById(momentId);
      if (!moment) {
        return res.json({ ok: false, msg: '朋友圈不存在' });
      }

      if (moment.userId !== req.user.id && !req.user.isAdmin) {
        return res.json({ ok: false, msg: '没有权限' });
      }

      const success = await Moment.delete(momentId);
      res.json({ ok: success, msg: success ? '删除成功' : '删除失败' });
    } catch (error) {
      res.json({ ok: false, msg: '删除失败', error: error.message });
    }
  }
}

module.exports = MomentController;
