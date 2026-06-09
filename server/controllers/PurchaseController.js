const Purchase = require('../models/Purchase');

class PurchaseController {
  static async submit(req, res) {
    try {
      const { username, type, details } = req.body;
      const paymentProof = req.file ? req.file.filename : null;

      if (!username || !type || !details || !paymentProof) {
        return res.json({ ok: false, msg: '参数不完整' });
      }

      let parsedDetails = details;
      if (typeof details === 'string') {
        try {
          parsedDetails = JSON.parse(details);
        } catch (e) {
          return res.json({ ok: false, msg: '订单详情格式错误' });
        }
      }

      const purchase = await Purchase.create({
        username,
        type,
        details: parsedDetails,
        paymentProof
      });

      res.json({ ok: true, msg: '提交成功，等待审核', purchase });
    } catch (error) {
      res.json({ ok: false, msg: '提交失败', error: error.message });
    }
  }

  static async getList(req, res) {
    try {
      const { page = 1, size = 20 } = req.body;
      const result = await Purchase.getAll(page, size);
      res.json({ ok: true, list: result.purchases, total: result.total });
    } catch (error) {
      res.json({ ok: false, msg: '获取列表失败', error: error.message });
    }
  }

  static async approve(req, res) {
    try {
      const { id } = req.body;
      const success = await Purchase.approve(id);
      res.json({ ok: success, msg: success ? '审核通过' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }

  static async reject(req, res) {
    try {
      const { id } = req.body;
      const success = await Purchase.reject(id);
      res.json({ ok: success, msg: success ? '已拒绝' : '操作失败' });
    } catch (error) {
      res.json({ ok: false, msg: '操作失败', error: error.message });
    }
  }
}

module.exports = PurchaseController;
