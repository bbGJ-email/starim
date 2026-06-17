import request from './request';

export const authApi = {
  register: (data) => request.post('/register', data),
  login: (data) => request.post('/login', data),
  sendResetPasswordCode: (email) => request.post('/password/send-reset-code', { email }),
  resetPassword: (data) => request.post('/password/reset', data)
};

export const userApi = {
  getStatus: (data) => request.post('/user/status', data),
  getInfo: (data = {}) => request.post('/user/info', data),
  search: (keyword) => request.post('/user/search', { keyword }),
  update: (data) => request.post('/user/update', data),
  updatePassword: (oldPassword, newPassword) => 
    request.post('/user/updatePwd', { oldPassword, newPassword }),
  delete: (password) => request.post('/user/delete', { password }),
  getSelf: () => request.post('/user/self'),
  getReferralStats: () => request.post('/user/referral-stats'),
  getRealNameStatus: () => request.post('/user/real-name/status'),
  submitRealName: (data) => request.post('/user/real-name/submit', data),
  sendBindEmailCode: (email) => request.post('/user/email/send-bind-code', { email }),
  confirmBindEmail: (data) => request.post('/user/email/confirm-bind', data),
  getStats: () => request.post('/user/stats')
};

export const publicAccountApi = {
  getList: () => request.post('/public-account/list'),
  register: (data) => request.post('/public-account/register', data),
  getDetail: (id) => request.post('/public-account/detail', { id }),
  subscribe: (id) => request.post('/public-account/subscribe', { id }),
  unsubscribe: (id) => request.post('/public-account/unsubscribe', { id })
};

export const messageApi = {
  getList: (chatId, type, page = 1, size = 50) => 
    request.post('/message/list', { chatId, type, page, size }),
  send: (data) => request.post('/message/send', data),
  markRead: (messageId) => request.post('/message/read', { messageId }),
  recall: (messageId) => request.post('/message/recall', { messageId })
};

export const friendApi = {
  getList: () => request.post('/friend/list'),
  add: (friendId, message = '') => request.post('/friend/add', { friendId, message }),
  delete: (friendId) => request.post('/friend/delete', { friendId }),
  getRequests: () => request.post('/friend/requests'),
  accept: (requestId) => request.post('/friend/accept', { requestId }),
  reject: (requestId) => request.post('/friend/reject', { requestId })
};

export const groupApi = {
  getList: () => request.post('/group/list'),
  create: (data) => request.post('/group/create', data),
  getInfo: (groupId) => request.post('/group/info', { groupId }),
  manage: (data) => request.post('/group/manage', data),
  join: (groupId) => request.post('/group/join', { groupId }),
  getCard: (groupId) => request.post('/group/card', { groupId })
};

export const momentApi = {
  publish: (content) => request.post('/moment/publish', { content }),
  getList: (page = 1, size = 20) => request.post('/moment/list', { page, size }),
  like: (momentId) => request.post('/moment/like', { momentId }),
  comment: (momentId, content) => request.post('/moment/comment', { momentId, content }),
  getComments: (momentId) => request.post('/moment/comments', { momentId }),
  delete: (momentId) => request.post('/moment/delete', { momentId })
};

export const reportApi = {
  submit: (data) => request.post('/report/submit', data),
  getMy: () => request.get('/report/my'),
  getList: (data) => request.get('/report/list', { params: data })
};

export const feedbackApi = {
  submit: (data) => request.post('/feedback/submit', data),
  getMy: () => request.get('/feedback/my'),
  getDetail: (id) => request.post('/feedback/detail', { id }),
  getAll: (page = 1, size = 20) => request.get('/feedback/list', { params: { page, size } }),
  handle: (data) => request.post('/feedback/handle', data),
  getStats: () => request.get('/feedback/stats')
};

export const adminApi = {
  getUsers: (page = 1, size = 20) => request.post('/admin/users', { page, size }),
  getGroups: (page = 1, size = 20) => request.post('/admin/groups', { page, size }),
  getMessages: (page = 1, size = 50) => request.post('/admin/messages', { page, size }),
  getStats: () => request.post('/admin/stats'),
  broadcast: (content) => request.post('/admin/broadcast', { content }),
  toggleBan: (userId, isBanned) => request.post('/admin/toggleBan', { userId, isBanned }),
  setAdmin: (userId, isAdmin) => request.post('/admin/setAdmin', { userId, isAdmin }),
  setSVIP: (userId, isSVIP) => request.post('/admin/setSVIP', { userId, isSVIP }),
  toggleGroupBan: (groupId, isBanned) => request.post('/admin/toggleGroupBan', { groupId, isBanned }),
  deleteMessage: (messageId) => request.post('/admin/delMsg', { messageId }),
  getUserIPs: (userId) => request.post('/admin/userIPs', { userId }),
  banIP: (data) => request.post('/admin/banIP', data),
  unbanIP: (ip) => request.post('/admin/unbanIP', { ip }),
  getBannedIPs: () => request.post('/admin/bannedIPs'),
  handleReport: (data) => request.post('/admin/handle', data),
  getPurchases: (page = 1, size = 20) => request.post('/admin/purchases', { page, size }),
  approvePurchase: (id) => request.post('/admin/purchase/approve', { id }),
  rejectPurchase: (id) => request.post('/admin/purchase/reject', { id })
};

export const miscApi = {
  getPrivacyPolicy: () => request.get('/privacy-policy'),
  proxyImage: (url) => `/api/image/proxy?url=${encodeURIComponent(url)}`
};
