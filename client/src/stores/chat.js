import { defineStore } from 'pinia';
import { ref, computed, nextTick } from 'vue';
import { messageApi, friendApi, groupApi } from '@/api';
import { useUserStore } from './user';
import { useSocketStore } from './socket';

export const useChatStore = defineStore('chat', () => {
  const currentChat = ref(null); // { id, type: 'private' | 'group', info }
  const messages = ref([]);
  const friends = ref([]);
  const groups = ref([]);
  const usersCache = ref(new Map());
  const unreadCounts = ref(new Map());
  
  // 计算属性：聊天列表
  const chatList = computed(() => {
    const list = [];
    
    friends.value.forEach(f => {
      list.push({
        id: f.id,
        type: 'private',
        name: f.nickname || f.username,
        avatar: f.avatar,
        info: f,
        lastMessage: f.lastMessage || '',
        lastMessageTime: f.lastMessageTime || 0,
        unreadCount: unreadCounts.value.get(f.id) || 0
      });
    });
    
    groups.value.forEach(g => {
      list.push({
        id: g.id,
        type: 'group',
        name: g.name,
        avatar: g.avatar,
        info: g,
        lastMessage: g.lastMessage || `${g.membersCount || 0} 人`,
        lastMessageTime: g.lastMessageTime || 0,
        unreadCount: unreadCounts.value.get(g.id) || 0
      });
    });
    
    return list.sort((a, b) => {
      const timeA = a.lastMessageTime ? new Date(a.lastMessageTime).getTime() : 0;
      const timeB = b.lastMessageTime ? new Date(b.lastMessageTime).getTime() : 0;
      return timeB - timeA;
    });
  });
  
  async function loadFriends() {
    try {
      const res = await friendApi.getList();
      if (res.ok) {
        friends.value = res.data || [];
        // 缓存用户信息
        friends.value.forEach(f => {
          usersCache.value.set(f.id, f);
        });
      }
    } catch (e) {
      console.error('加载好友列表失败:', e);
    }
  }
  
  async function loadGroups() {
    try {
      const res = await groupApi.getList();
      if (res.ok) {
        groups.value = res.data || [];
      }
    } catch (e) {
      console.error('加载群组列表失败:', e);
    }
  }
  
  async function loadChatData() {
    await Promise.all([loadFriends(), loadGroups()]);
  }
  
  async function openChat(id, type) {
    let info = null;
    
    if (type === 'private') {
      info = friends.value.find(f => f.id === id) || usersCache.value.get(id);
    } else if (type === 'group') {
      info = groups.value.find(g => g.id === id);
      if (info) {
        // 获取最新群组信息
        const res = await groupApi.getInfo(id);
        if (res.ok) {
          info = res.info || res.group;
        }
      }
    }
    
    currentChat.value = { id, type, info };
    messages.value = [];
    unreadCounts.value.set(id, 0);
    
    // 通过Socket获取聊天历史
    const socketStore = useSocketStore();
    socketStore.getChatHistory(id, type);
  }
  
  function closeChat() {
    currentChat.value = null;
    messages.value = [];
  }
  
  function clearMessages() {
    messages.value = [];
  }
  
  function addHistoryMessage(message) {
    // 缓存用户信息
    if (message.sender && message.sender.id) {
      usersCache.value.set(message.sender.id, message.sender);
    }
    // 历史消息添加到末尾（后端已返回正序）
    messages.value.push(message);
  }
  
  function handleNewMessage(message) {
    const userStore = useUserStore();
    
    // 缓存用户信息
    if (message.sender && message.sender.id) {
      usersCache.value.set(message.sender.id, message.sender);
    }
    
    // 检查是否是当前聊天
    const isCurrentChat = currentChat.value && (
      (currentChat.value.type === 'private' && 
        (message.senderId === currentChat.value.id || message.receiverId === currentChat.value.id) &&
        !message.groupId) ||
      (currentChat.value.type === 'group' && message.groupId === currentChat.value.id)
    );
    
    if (isCurrentChat) {
      messages.value.push(message);
      nextTick(() => scrollToBottom());
      
      // 标记为已读
      if (message.senderId !== userStore.user.id) {
        messageApi.markRead(message.id);
      }
    } else {
      // 增加未读计数
      const chatId = message.groupId || message.senderId;
      const current = unreadCounts.value.get(chatId) || 0;
      unreadCounts.value.set(chatId, current + 1);
    }
    
    // 更新聊天列表的最后消息
    updateLastMessage(message);
  }
  
  function handleMessageRead(messageId) {
    const msg = messages.value.find(m => m.id === messageId);
    if (msg) {
      msg.read = true;
    }
  }
  
  function handleMessageRecalled(messageId) {
    const msg = messages.value.find(m => m.id === messageId);
    if (msg) {
      msg.isRecalled = true;
    }
  }
  
  function updateLastMessage(message) {
    if (message.groupId) {
      const group = groups.value.find(g => g.id === message.groupId);
      if (group) {
        group.lastMessage = message.content;
        group.lastMessageTime = message.timestamp;
      }
    } else {
      const userStore = useUserStore();
      const friendId = message.senderId === userStore.user.id ? message.receiverId : message.senderId;
      const friend = friends.value.find(f => f.id === friendId);
      if (friend) {
        friend.lastMessage = message.content;
        friend.lastMessageTime = message.timestamp;
      }
    }
  }
  
  async function sendMessage(data) {
    try {
      const res = await messageApi.send(data);
      return res;
    } catch (e) {
      console.error('发送消息失败:', e);
      throw e;
    }
  }
  
  async function recallMessage(messageId) {
    try {
      const res = await messageApi.recall(messageId);
      return res;
    } catch (e) {
      console.error('撤回消息失败:', e);
      throw e;
    }
  }
  
  function scrollToBottom() {
    nextTick(() => {
      const msgWindow = document.getElementById('messageWindow');
      if (msgWindow) {
        msgWindow.scrollTop = msgWindow.scrollHeight;
      }
    });
  }
  
  function getUserInfo(userId) {
    return usersCache.value.get(userId);
  }
  
  async function updateChatSetting({ chatId, type, setting, value }) {
    try {
      // 本地存储设置
      const settings = JSON.parse(localStorage.getItem('chatSettings') || '{}');
      if (!settings[chatId]) {
        settings[chatId] = {};
      }
      settings[chatId][setting] = value;
      localStorage.setItem('chatSettings', JSON.stringify(settings));
      
      return { ok: true, msg: '设置成功' };
    } catch (e) {
      console.error('更新聊天设置失败:', e);
      return { ok: false, msg: '设置失败' };
    }
  }
  
  return {
    currentChat,
    messages,
    friends,
    groups,
    usersCache,
    unreadCounts,
    chatList,
    loadFriends,
    loadGroups,
    loadChatData,
    openChat,
    closeChat,
    clearMessages,
    addHistoryMessage,
    handleNewMessage,
    handleMessageRead,
    handleMessageRecalled,
    sendMessage,
    recallMessage,
    scrollToBottom,
    getUserInfo,
    updateChatSetting
  };
});
