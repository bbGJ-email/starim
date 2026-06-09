function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function generateInvitationCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function generateUniqueId(prefix = '') {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

module.exports = {
  generateId,
  generateInvitationCode,
  generateUniqueId
};
