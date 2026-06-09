import axios from 'axios';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';

const baseURL = import.meta.env.VITE_API_URL || '/api';

const request = axios.create({
  baseURL,
  timeout: 30000
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error) => {
    const toastStore = useToastStore();
    
    if (error.response) {
      const { status, data } = error.response;
      
      if (status === 401) {
        // 令牌过期或无效
        const userStore = useUserStore();
        userStore.logout();
        toastStore.error(data?.msg || '登录已过期，请重新登录');
      } else if (status === 403) {
        toastStore.error(data?.msg || '您没有权限执行此操作');
      } else if (status === 429) {
        toastStore.warning('请求过于频繁，请稍后再试');
      } else if (status >= 500) {
        toastStore.error('服务器错误，请稍后再试');
      } else {
        toastStore.error(data?.msg || '请求失败');
      }
    } else if (error.request) {
      toastStore.error('网络连接失败');
    } else {
      toastStore.error(error.message || '未知错误');
    }
    
    return Promise.reject(error);
  }
);

export default request;
