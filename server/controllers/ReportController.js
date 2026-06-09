const Report = require('../models/Report');
const { generateId } = require('../utils/idGenerator');

class ReportController {
  static async submit(req, res) {
    try {
      const { targetType, targetId, reason, description } = req.body;
      if (!targetType || !targetId || !reason) {
        return res.json({ ok: false, msg: '参数不完整' });
      }

      const reportId = generateId();
      const report = await Report.create({
        id: reportId,
        reporterId: req.user.id,
        targetType,
        targetId,
        reason,
        description: description || ''
      });

      res.json({ ok: true, msg: '投诉已提交', report });
    } catch (error) {
      res.json({ ok: false, msg: '提交投诉失败', error: error.message });
    }
  }

  static async getMy(req, res) {
    try {
      const reports = await Report.getByReporter(req.user.id);
      res.json({ ok: true, data: reports });
    } catch (error) {
      res.json({ ok: false, msg: '获取投诉列表失败', error: error.message });
    }
  }

  static async getList(req, res) {
    try {
      const { page = 1, size = 20 } = req.body;
      const result = await Report.getAll(page, size);
      res.json({ ok: true, ...result });
    } catch (error) {
      res.json({ ok: false, msg: '获取投诉列表失败', error: error.message });
    }
  }

  static async handle(req, res) {
    try {
      const { reportId, status, response } = req.body;
      if (!reportId || !status) {
        return res.json({ ok: false, msg: '参数不完整' });
      }

      const success = await Report.handle(reportId, req.user.id, response || '', status);
      res.json({ ok: success, msg: success ? '处理成功' : '处理失败' });
    } catch (error) {
      res.json({ ok: false, msg: '处理投诉失败', error: error.message });
    }
  }
}

module.exports = ReportController;
