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
        <h1 class="auth-title">创建账号</h1>
        <p class="auth-subtitle">加入星智IM，开启全新沟通体验</p>
      </div>
      
      <form @submit.prevent="handleRegister" class="auth-form">
        <div class="form-group">
          <label>用户名</label>
          <input
            v-model="username"
            type="text"
            class="input"
            placeholder="3-20个字符"
            autocomplete="username"
            :disabled="loading"
            minlength="3"
            maxlength="20"
            required
          />
        </div>
        
        <div class="form-group">
          <label>密码</label>
          <input
            v-model="password"
            type="password"
            class="input"
            placeholder="至少6个字符"
            autocomplete="new-password"
            :disabled="loading"
            minlength="6"
            required
          />
        </div>
        
        <div class="form-group">
          <label>确认密码</label>
          <input
            v-model="confirmPassword"
            type="password"
            class="input"
            placeholder="再次输入密码"
            autocomplete="new-password"
            :disabled="loading"
            required
          />
        </div>
        
        <div class="form-group">
          <label>邀请码 <span class="optional">(可选)</span></label>
          <input
            v-model="invitationCode"
            type="text"
            class="input"
            placeholder="输入邀请码可获得奖励"
            :disabled="loading"
          />
        </div>
        
        <button type="submit" class="btn btn-block btn-lg" :disabled="loading">
          {{ loading ? '注册中...' : '注册' }}
        </button>
        
        <div class="auth-footer">
          <span>已有账号？</span>
          <router-link to="/login" class="link">立即登录</router-link>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const userStore = useUserStore();
const toastStore = useToastStore();

const username = ref('');
const password = ref('');
const confirmPassword = ref('');
const invitationCode = ref('');
const loading = ref(false);

async function handleRegister() {
  if (!username.value || !password.value) {
    toastStore.warning('请填写完整信息');
    return;
  }
  
  if (username.value.length < 3 || username.value.length > 20) {
    toastStore.warning('用户名长度必须在3-20个字符之间');
    return;
  }
  
  if (password.value.length < 6) {
    toastStore.warning('密码长度至少为6个字符');
    return;
  }
  
  if (password.value !== confirmPassword.value) {
    toastStore.warning('两次密码输入不一致');
    return;
  }
  
  loading.value = true;
  try {
    const res = await userStore.register(username.value, password.value, invitationCode.value);
    if (res.ok) {
      toastStore.success('注册成功');
      router.push('/chat');
    } else {
      toastStore.error(res.msg || '注册失败');
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
  max-height: 90vh;
  overflow-y: auto;
}

.auth-header {
  text-align: center;
  margin-bottom: 28px;
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
  font-size: 24px;
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
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  
  label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-secondary);
    
    .optional {
      color: var(--text-muted);
      font-weight: normal;
      font-size: 12px;
    }
  }
}

.auth-footer {
  text-align: center;
  margin-top: 12px;
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