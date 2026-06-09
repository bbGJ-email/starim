const ONLINE_TIMEOUT = 5 * 60 * 1000;

const onlineUsers = new Map();

function isUserOnline(userId) {
  const lastSeen = onlineUsers.get(userId);
  return Boolean(lastSeen && Date.now() - lastSeen < ONLINE_TIMEOUT);
}

function updateOnlineStatus(userId) {
  onlineUsers.set(userId, Date.now());
}

function getLastSeen(userId) {
  return onlineUsers.get(userId);
}

function removeOnlineStatus(userId) {
  onlineUsers.delete(userId);
}

module.exports = {
  onlineUsers,
  isUserOnline,
  updateOnlineStatus,
  getLastSeen,
  removeOnlineStatus,
  ONLINE_TIMEOUT
};
