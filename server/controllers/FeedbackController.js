const Feedback = require('../models/Feedback');

class FeedbackController {
  static async submit(req, res) {
    try {
      const { type, title, content, screenshots } = req.body;
      
      if (!title || title.trim().length === 0) {
        return res.json({ ok: false, msg: '标题不能为空' });
      }
      
      if (!content || content.trim().length === 0) {
        return res.json({ ok: false, msg: '内容不能为空' });
      }

      const feedbackId = await Feedback.create({
        userId: req.user.id,
        type: type || 'other',
        title: title.trim(),
        content: content.trim(),
        screenshots: screenshots || []
      });

      res.json({ ok: true, msg: '反馈提交成功', feedbackId });
    } catch (error) {
      res.json({ ok: false, msg: '提交失败', error: error.message });
    }
  }

  static async getMyList(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 20;
      const feedbacks = await Feedback.findByUserId(req.user.id, page, size);
      res.json({ ok: true, data: feedbacks });
    } catch (error) {
      res.json({ ok: false, msg: '获取反馈列表失败', error: error.message });
    }
  }

  static async getDetail(req, res) {
    try {
      const { id } = req.body;
      if (!id) {
        return res.json({ ok: false, msg: '缺少反馈ID' });
      }

      const feedback = await Feedback.findById(id);
      if (!feedback) {
        return res.json({ ok: false, msg: '反馈不存在' });
      }

      res.json({ ok: true, data: feedback });
    } catch (error) {
      res.json({ ok: false, msg: '获取反馈详情失败', error: error.message });
    }
  }

  static async getAll(req, res) {
    try {
      const page = parseInt(req.query.page) || 1;
      const size = parseInt(req.query.size) || 20;
      const feedbacks = await Feedback.findAll(page, size);
      res.json({ ok: true, data: feedbacks });
    } catch (error) {
      res.json({ ok: false, msg: '获取反馈列表失败', error: error.message });
    }
  }

  static async handle(req, res) {
    try {
      const { id, status, reply } = req.body;
      
      if (!id || !status) {
        return res.json({ ok: false, msg: '参数不完整' });
      }

      const updates = { status };
      if (reply) {
        updates.reply = reply;
      }

      const success = await Feedback.update(id, updates);
      res.json({ ok: success, msg: success ? '处理成功' : '处理失败' });
    } catch (error) {
      res.json({ ok: false, msg: '处理失败', error: error.message });
    }
  }

  static async getStats(req, res) {
    try {
      const total = await Feedback.getCount();
      const pending = await Feedback.getCount('pending');
      const processing = await Feedback.getCount('processing');
      const resolved = await Feedback.getCount('resolved');
      const rejected = await Feedback.getCount('rejected');

      res.json({
        ok: true,
        data: { total, pending, processing, resolved, rejected }
      });
    } catch (error) {
      res.json({ ok: false, msg: '获取统计数据失败', error: error.message });
    }
  }
}

module.exports = FeedbackController;