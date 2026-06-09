import { defineStore } from 'pinia';
import { ref } from 'vue';
import { io } from 'socket.io-client';
import { useUserStore } from './user';
import { useChatStore } from './chat';
import { useToastStore } from './toast';

export const useSocketStore = defineStore('socket', () => {
  const socket = ref(null);
  const isConnected = ref(false);
  const onlineUsers = ref(new Set());
  
  function connect() {
    if (socket.value?.connected) return;
    
    const userStore = useUserStore();
    if (!userStore.isLoggedIn) return;
    
    const socketURL = import.meta.env.VITE_SOCKET_URL || '/';
    socket.value = io(socketURL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity
    });
    
    setupEventListeners();
  }
  
  function setupEventListeners() {
    const s = socket.value;
    const userStore = useUserStore();
    const chatStore = useChatStore();
    const toastStore = useToastStore();
    
    s.on('connect', () => {
      console.log('✅ Socket已连接');
      isConnected.value = true;
      
      // 发送认证
      s.emit('authenticate', {
        userId: userStore.user.id,
        token: userStore.token
      });
    });
    
    s.on('disconnect', () => {
      console.log('❌ Socket已断开');
      isConnected.value = false;
    });
    
    s.on('authenticated', (data) => {
      if (data.ok) {
        console.log('✅ Socket认证成功');
        startHeartbeat();
      } else {
        console.error('❌ Socket认证失败:', data.msg);
        toastStore.error(data.msg || '认证失败');
      }
    });
    
    s.on('token_expired', () => {
      toastStore.error('登录已过期');
      userStore.logout();
    });
    
    s.on('heartbeat_ack', () => {
      // 心跳响应
    });
    
    // 新消息
    s.on('new_message', (message) => {
      chatStore.handleNewMessage(message);
    });
    
    // 消息已读
    s.on('message_read', (data) => {
      chatStore.handleMessageRead(data.messageId);
    });
    
    // 消息撤回
    s.on('message_recalled', (data) => {
      chatStore.handleMessageRecalled(data.messageId);
    });
    
    // 用户状态变更
    s.on('user_status_change', (data) => {
      if (data.online) {
        onlineUsers.value.add(data.userId);
      } else {
        onlineUsers.value.delete(data.userId);
      }
    });
    
    // 好友请求
    s.on('friend_request', (data) => {
      toastStore.info(`${data.fromUser.nickname || data.fromUser.username} 请求添加你为好友`);
    });
    
    s.on('friend_request_accepted', (data) => {
      toastStore.success(`${data.friend.nickname || data.friend.username} 已通过你的好友请求`);
      userStore.refreshUserInfo();
    });
    
    // 群组事件
    s.on('group_kicked', (data) => {
      toastStore.warning('你已被移出群组');
      userStore.refreshUserInfo();
    });
    
    s.on('svip_join', (data) => {
      toastStore.info(`SVIP用户 ${data.user.nickname} 加入了群组`);
    });
    
    // 系统广播
    s.on('broadcast', (data) => {
      toastStore.info(`系统广播: ${data.content}`);
    });
    
    // 聊天历史（一次性加载）
    s.on('chat_history', (data) => {
      if (data.ok && data.messages) {
        chatStore.clearMessages();
        data.messages.forEach(msg => {
          chatStore.addHistoryMessage(msg);
        });
        chatStore.scrollToBottom();
      }
    });
  }
  
  let heartbeatTimer = null;
  function startHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (socket.value?.connected) {
        socket.value.emit('heartbeat');
      }
    }, 30000);
  }
  
  function disconnect() {
    if (heartbeatTimer) {
      clearInterval(heartbeatTimer);
      heartbeatTimer = null;
    }
    if (socket.value) {
      socket.value.disconnect();
      socket.value = null;
    }
    isConnected.value = false;
    onlineUsers.value.clear();
  }
  
  function emit(event, data) {
    if (socket.value?.connected) {
      socket.value.emit(event, data);
      return true;
    }
    return false;
  }
  
  function getChatHistory(chatId, type) {
    const userStore = useUserStore();
    emit('get_chat_history', {
      userId: userStore.user.id,
      chatId,
      type
    });
  }
  
  return {
    socket,
    isConnected,
    onlineUsers,
    connect,
    disconnect,
    emit,
    getChatHistory
  };
});
