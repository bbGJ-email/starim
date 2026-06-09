<template>
  <div class="auth-container">
    <div class="auth-bg">
      <div class="bg-blob bg-blob-1"></div>
      <div class="bg-blob bg-blob-2"></div>
      <div class="bg-blob bg-blob-3"></div>
    </div>
    
    <div class="auth-card">
      <div class="auth-header">
        <div class="auth-logo-wrapper">
          <img class="auth-logo" src="https://s41.ax1x.com/2026/01/19/pZ6lpFI.png" alt="星智IM" />
        </div>
        <h1 class="auth-title">星智IM</h1>
        <p class="auth-subtitle">欢迎回来，请登录您的账号</p>
      </div>
      
      <form @submit.prevent="handleLogin" class="auth-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            class="input"
            placeholder="请输入用户名"
            autocomplete="username"
            :disabled="loading"
            required
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="请输入密码"
            autocomplete="current-password"
            :disabled="loading"
            required
          />
        </div>
        
        <button type="submit" class="btn btn-block btn-lg" :disabled="loading">
          {{ loading ? '登录中...' : '登录' }}
        </button>
        
        <div class="auth-footer">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toastStore = useToastStore();

const username = ref('');
const password = ref('');
const loading = ref(false);

async function handleLogin() {
  if (!username.value || !password.value) {
    toastStore.warning('请填写完整信息');
    return;
  }
  
  loading.value = true;
  try {
    const res = await userStore.login(username.value, password.value);
    if (res.ok) {
      toastStore.success('登录成功');
      const redirect = route.query.redirect || '/chat';
      router.push(redirect);
    } else {
      toastStore.error(res.msg || '登录失败');
    }
  } catch (e) {
    console.error(e);
  } finally {
    loading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.auth-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: var(--gradient-bg);
}

.auth-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.bg-blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.5;
  animation: float 20s ease-in-out infinite;
  
  &.bg-blob-1 {
    width: 400px;
    height: 400px;
    background: var(--primary);
    top: -100px;
    left: -100px;
  }
  
  &.bg-blob-2 {
    width: 500px;
    height: 500px;
    background: var(--primary-light);
    bottom: -150px;
    right: -150px;
    animation-delay: -7s;
  }
  
  &.bg-blob-3 {
    width: 300px;
    height: 300px;
    background: var(--secondary);
    top: 50%;
    left: 50%;
    animation-delay: -14s;
  }
}

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  33% { transform: translate(50px, -50px); }
  66% { transform: translate(-30px, 30px); }
}

.auth-card {
  position: relative;
  width: 90%;
  max-width: 420px;
  padding: 40px;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid rgba(255, 255, 255, 0.5);
  animation: scaleIn 0.4s ease;
}

.auth-header {
  text-align: center;
  margin-bottom: 32px;
}

.auth-logo-wrapper {
  width: 80px;
  height: 80px;
  margin: 0 auto 12px;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(98, 74, 55, 0.18);
}

.auth-logo {
  width: 50px;
  height: 50px;
  object-fit: contain;
}

.auth-title {
  margin: 0 0 8px;
  font-size: 28px;
  font-weight: 700;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.auth-subtitle {
  margin: 0;
  color: var(--text-secondary);
  font-size: 14px;
}

.auth-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  
  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
  }
}

.auth-footer {
  text-align: center;
  margin-top: 16px;
  font-size: 14px;
  color: var(--text-secondary);
  
  .link {
    color: var(--primary);
    text-decoration: none;
    margin-left: 4px;
    font-weight: 500;
    
    &:hover {
      text-decoration: underline;
    }
  }
}
</style>