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
        <div class="auth-notice">
          <div class="notice-badge">重要提示</div>
          <div class="notice-content">
            <h2>数据库已完成清空与重置</h2>
            <p>当前为全新环境，历史账号、消息和资料已清理，请使用新账号登录或重新注册。</p>
          </div>
        </div>
        <div class="auth-update-card">
          <div class="update-card-header">
            <span class="update-badge">内容安全更新</span>
            <h2>异步审核已上线</h2>
          </div>
          <div class="update-feature-list">
            <div class="update-feature">
              <span class="feature-dot">AI</span>
              <p>三层 AI / 接口 / 本地词库按序审核，异常自动降级。</p>
            </div>
            <div class="update-feature">
              <span class="feature-dot">快</span>
              <p>消息先发送再后台审核，对话发送体验不被阻塞。</p>
            </div>
            <div class="update-feature">
              <span class="feature-dot">护</span>
              <p>命中敏感内容后自动屏蔽，并实时更新当前消息气泡。</p>
            </div>
          </div>
        </div>
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

        <button type="button" class="forgot-btn" @click="showResetPassword = true">忘记密码？</button>
        
        <div class="auth-footer">
          <span>还没有账号？</span>
          <router-link to="/register" class="link">立即注册</router-link>
        </div>
      </form>
    </div>
    <div v-if="showResetPassword" class="modal-overlay" @click.self="showResetPassword = false">
      <div class="modal-content reset-card">
        <div class="modal-header">
          <h3>找回密码</h3>
          <button class="close-btn" @click="showResetPassword = false">✕</button>
        </div>
        <div class="modal-body">
          <p class="reset-tip">输入已绑定邮箱，使用验证码重置密码。</p>
          <div class="form-group">
            <label>绑定邮箱</label>
            <input v-model="resetForm.email" type="email" class="input" placeholder="请输入邮箱" autocomplete="email" />
          </div>
          <div class="form-group code-row">
            <div class="code-input">
              <label>验证码</label>
              <input v-model="resetForm.code" class="input" placeholder="请输入验证码" autocomplete="one-time-code" />
            </div>
            <button class="btn btn-secondary" :disabled="resetLoading" @click="sendResetCode">发送验证码</button>
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input v-model="resetForm.newPassword" type="password" class="input" placeholder="至少 6 位" autocomplete="new-password" />
          </div>
          <div class="form-group">
            <label>确认新密码</label>
            <input v-model="resetForm.confirmPassword" type="password" class="input" placeholder="请再次输入新密码" autocomplete="new-password" />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showResetPassword = false">取消</button>
          <button class="btn" :disabled="resetLoading" @click="resetPassword">确认重置</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';
import { authApi } from '@/api';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toastStore = useToastStore();

const username = ref('');
const password = ref('');
const loading = ref(false);
const resetLoading = ref(false);
const showResetPassword = ref(false);
const resetForm = ref({
  email: '',
  code: '',
  newPassword: '',
  confirmPassword: ''
});

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

async function sendResetCode() {
  if (!resetForm.value.email.trim()) {
    toastStore.warning('请输入绑定邮箱');
    return;
  }

  resetLoading.value = true;
  try {
    const res = await authApi.sendResetPasswordCode(resetForm.value.email);
    if (res.ok) {
      toastStore.success(res.msg || '验证码已发送');
    } else {
      toastStore.error(res.msg || '发送失败');
    }
  } finally {
    resetLoading.value = false;
  }
}

async function resetPassword() {
  if (!resetForm.value.email.trim() || !resetForm.value.code.trim() || !resetForm.value.newPassword) {
    toastStore.warning('请填写邮箱、验证码和新密码');
    return;
  }
  if (resetForm.value.newPassword !== resetForm.value.confirmPassword) {
    toastStore.warning('两次输入的新密码不一致');
    return;
  }

  resetLoading.value = true;
  try {
    const res = await authApi.resetPassword({
      email: resetForm.value.email,
      code: resetForm.value.code,
      newPassword: resetForm.value.newPassword
    });
    if (res.ok) {
      toastStore.success(res.msg || '密码重置成功');
      showResetPassword.value = false;
      resetForm.value = { email: '', code: '', newPassword: '', confirmPassword: '' };
    } else {
      toastStore.error(res.msg || '重置失败');
    }
  } finally {
    resetLoading.value = false;
  }
}
</script>

<style lang="scss" scoped>
.auth-container {
  position: relative;
  width: 100%;
  min-height: 100vh;
  padding: 32px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden auto;
  background: var(--gradient-bg);
  box-sizing: border-box;
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

.auth-notice {
  margin: 20px 0 24px;
  padding: 16px 18px;
  border-radius: 18px;
  background: linear-gradient(135deg, rgba(246, 238, 226, 0.96), rgba(239, 230, 218, 0.9));
  border: 1px solid rgba(149, 117, 89, 0.18);
  box-shadow: 0 12px 28px rgba(98, 74, 55, 0.08);
}

.notice-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  margin-bottom: 10px;
  border-radius: 999px;
  background: rgba(98, 74, 55, 0.08);
  color: var(--primary);
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.08em;
}

.notice-content h2 {
  margin: 0 0 6px;
  color: var(--text-primary);
  font-size: 18px;
  line-height: 1.35;
}

.notice-content p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.auth-update-card {
  margin-top: 14px;
  padding: 16px;
  border-radius: 20px;
  background: linear-gradient(135deg, rgba(255, 250, 244, 0.96), rgba(245, 231, 214, 0.9));
  border: 1px solid rgba(154, 106, 79, 0.16);
  box-shadow: 0 14px 30px rgba(98, 74, 55, 0.08);
  text-align: left;
}

.update-card-header {
  margin-bottom: 12px;

  h2 {
    margin: 8px 0 0;
    color: var(--text-primary);
    font-size: 18px;
    line-height: 1.35;
  }
}

.update-badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 999px;
  background: rgba(154, 106, 79, 0.1);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
}

.update-feature-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.update-feature {
  display: flex;
  gap: 10px;
  align-items: flex-start;

  p {
    margin: 0;
    color: var(--text-secondary);
    font-size: 13px;
    line-height: 1.6;
  }
}

.feature-dot {
  width: 28px;
  height: 28px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(154, 106, 79, 0.12);
  color: var(--primary);
  font-size: 12px;
  font-weight: 700;
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

.forgot-btn {
  align-self: center;
  border: none;
  background: transparent;
  color: var(--primary);
  cursor: pointer;
  font-weight: 500;

  &:hover {
    text-decoration: underline;
  }
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(47, 41, 35, 0.38);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border-light);
}

.modal-header,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.modal-header {
  margin-bottom: 20px;

  h3 {
    margin: 0;
    color: var(--text-primary);
  }
}

.modal-body {
  margin-bottom: 20px;
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--bg-secondary);
  color: var(--text-secondary);
  cursor: pointer;
}

.reset-card {
  width: min(92vw, 440px);
  background: var(--bg-card);
}

.reset-tip {
  margin: 0 0 16px;
  color: var(--text-secondary);
}

.code-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;

  .code-input {
    flex: 1;
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