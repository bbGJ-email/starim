import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { authApi, userApi } from '@/api';
import { useSocketStore } from './socket';
import router from '@/router';

export const useUserStore = defineStore('user', () => {
  const user = ref(null);
  const token = ref(localStorage.getItem('token') || '');
  
  const isLoggedIn = computed(() => !!token.value && !!user.value);
  const isAdmin = computed(() => user.value?.isAdmin || false);
  const isSVIP = computed(() => user.value?.isSVIP || false);
  
  async function login(username, password) {
    const res = await authApi.login({ username, password });
    if (res.ok) {
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      
      const socketStore = useSocketStore();
      socketStore.connect();
    }
    return res;
  }
  
  async function register(username, password, invitationCode = '') {
    const res = await authApi.register({ username, password, invitationCode });
    if (res.ok) {
      token.value = res.token;
      user.value = res.user;
      localStorage.setItem('token', res.token);
      localStorage.setItem('user', JSON.stringify(res.user));
      
      const socketStore = useSocketStore();
      socketStore.connect();
    }
    return res;
  }
  
  function logout() {
    token.value = '';
    user.value = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    
    const socketStore = useSocketStore();
    socketStore.disconnect();
    
    router.push('/login');
  }
  
  function restoreFromStorage() {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    if (storedToken && storedUser) {
      try {
        token.value = storedToken;
        user.value = JSON.parse(storedUser);
        return true;
      } catch (e) {
        logout();
      }
    }
    return false;
  }
  
  async function refreshUserInfo() {
    try {
      const res = await userApi.getSelf();
      if (res.ok) {
        user.value = { ...user.value, ...res.info };
        localStorage.setItem('user', JSON.stringify(user.value));
      }
      return res;
    } catch (e) {
      console.error('刷新用户信息失败:', e);
    }
  }
  
  async function updateProfile(updates) {
    const res = await userApi.update(updates);
    if (res.ok) {
      user.value = { ...user.value, ...res.user };
      localStorage.setItem('user', JSON.stringify(user.value));
    }
    return res;
  }
  
  return {
    user,
    token,
    isLoggedIn,
    isAdmin,
    isSVIP,
    login,
    register,
    logout,
    restoreFromStorage,
    refreshUserInfo,
    updateProfile
  };
});
