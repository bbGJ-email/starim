function getCurrentMySQLDate() {
  return new Date().toISOString().slice(0, 19).replace('T', ' ');
}

function toISODate(date) {
  if (!date) return null;
  if (typeof date === 'string') {
    date = new Date(date);
  }
  return date.toISOString();
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now - date;

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < minute) {
    return '刚刚';
  } else if (diff < hour) {
    return `${Math.floor(diff / minute)}分钟前`;
  } else if (diff < day) {
    return `${Math.floor(diff / hour)}小时前`;
  } else if (diff < 7 * day) {
    return `${Math.floor(diff / day)}天前`;
  } else {
    return date.toLocaleDateString('zh-CN');
  }
}

module.exports = {
  getCurrentMySQLDate,
  toISODate,
  formatTime
};
