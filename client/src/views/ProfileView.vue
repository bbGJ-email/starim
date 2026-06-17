<template>
  <AppLayout>
    <div class="profile-view">
      <div class="profile-header">
        <div class="profile-cover">
          <div class="cover-placeholder">
            <span class="cover-icon">🖼️</span>
          </div>
        </div>
        <div class="profile-info">
          <AvatarComponent
            :src="user.avatar"
            :name="user.nickname || user.username"
            size="lg"
            class="profile-avatar"
          />
          <h2 class="profile-name">{{ user.nickname || user.username }}</h2>
          <p class="profile-id">ID: {{ user.id }}</p>
        </div>
      </div>
      
      <div class="profile-content">
        <div v-if="realNameStatus.status !== 'verified'" class="security-notice">
          <span class="notice-icon">🌾</span>
          <div>
            <strong>建议完成实名认证</strong>
            <p>认证不会阻断基础使用，可提升账号安全和可信度。</p>
          </div>
          <button class="btn btn-secondary btn-sm" @click="showRealName = true">去认证</button>
        </div>

        <div class="section">
          <h3 class="section-title">基本信息</h3>
          <div class="info-list">
            <div class="info-item">
              <span class="info-label">用户名</span>
              <span class="info-value">{{ user.username }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">昵称</span>
              <span class="info-value">{{ user.nickname || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邮箱</span>
              <span class="info-value">
                {{ user.emailVerified ? user.email : '未绑定' }}
                <span v-if="user.emailVerified" class="badge badge-success">已验证</span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">实名认证</span>
              <span class="info-value">
                {{ realNameStatus.status === 'verified' ? '已认证' : '未认证' }}
                <span :class="['badge', realNameStatus.status === 'verified' ? 'badge-success' : 'badge-warning']">
                  {{ realNameStatus.status === 'verified' ? realNameStatus.realNameMasked : '建议认证' }}
                </span>
              </span>
            </div>
            <div class="info-item">
              <span class="info-label">手机号</span>
              <span class="info-value">{{ user.phone || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">签名</span>
              <span class="info-value">{{ user.signature || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">邀请码</span>
              <div class="invitation-code">
                <span class="info-value">{{ user.invitationCode || '-' }}</span>
                <button v-if="user.invitationCode" class="copy-btn" @click="copyInvitationCode">复制</button>
              </div>
            </div>
            <div class="info-item">
              <span class="info-label">注册时间</span>
              <span class="info-value">{{ formatDateTime(user.createdAt) }}</span>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3 class="section-title">统计数据</h3>
          <div class="stats-grid">
            <div class="stat-item">
              <span class="stat-value">{{ stats.friendCount }}</span>
              <span class="stat-label">好友</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.groupCount }}</span>
              <span class="stat-label">群组</span>
            </div>
            <div class="stat-item">
              <span class="stat-value">{{ stats.momentCount }}</span>
              <span class="stat-label">动态</span>
            </div>
          </div>
        </div>
        
        <div class="section">
          <h3 class="section-title">设置</h3>
          <div class="settings-list">
            <button class="settings-item" @click="showEditProfile = true">
              <span class="settings-icon">👤</span>
              <span class="settings-text">编辑资料</span>
              <span class="settings-arrow">›</span>
            </button>
            <button class="settings-item" @click="showRealName = true">
              <span class="settings-icon">🪪</span>
              <span class="settings-text">实名认证</span>
              <span class="settings-arrow">›</span>
            </button>
            <button class="settings-item" @click="showBindEmail = true">
              <span class="settings-icon">✉️</span>
              <span class="settings-text">绑定邮箱</span>
              <span class="settings-arrow">›</span>
            </button>
            <button class="settings-item" @click="changePassword">
              <span class="settings-icon">🔐</span>
              <span class="settings-text">修改密码</span>
              <span class="settings-arrow">›</span>
            </button>
            <button class="settings-item" @click="showNotification = true">
              <span class="settings-icon">🔔</span>
              <span class="settings-text">通知设置</span>
              <span class="settings-arrow">›</span>
            </button>
            <button class="settings-item logout-btn" @click="handleLogout">
              <span class="settings-icon">🚪</span>
              <span class="settings-text">退出登录</span>
              <span class="settings-arrow">›</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 编辑资料弹窗 -->
    <div v-if="showEditProfile" class="modal-overlay" @click.self="showEditProfile = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>编辑资料</h3>
          <button class="close-btn" @click="showEditProfile = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>昵称</label>
            <input
              v-model="editForm.nickname"
              type="text"
              class="input"
              placeholder="请输入昵称"
              maxlength="20"
            />
          </div>
          <div class="form-group">
            <label>签名</label>
            <textarea
              v-model="editForm.signature"
              class="input"
              placeholder="个人签名"
              rows="3"
              maxlength="100"
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showEditProfile = false">取消</button>
          <button class="btn btn-primary" @click="handleSaveProfile">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 修改密码弹窗 -->
    <div v-if="showChangePassword" class="modal-overlay" @click.self="showChangePassword = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>修改密码</h3>
          <button class="close-btn" @click="showChangePassword = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>旧密码</label>
            <input
              v-model="passwordForm.oldPassword"
              type="password"
              class="input"
              placeholder="请输入旧密码"
            />
          </div>
          <div class="form-group">
            <label>新密码</label>
            <input
              v-model="passwordForm.newPassword"
              type="password"
              class="input"
              placeholder="请输入新密码"
            />
          </div>
          <div class="form-group">
            <label>确认密码</label>
            <input
              v-model="passwordForm.confirmPassword"
              type="password"
              class="input"
              placeholder="请再次输入新密码"
            />
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showChangePassword = false">取消</button>
          <button class="btn btn-primary" @click="handleChangePassword">确认修改</button>
        </div>
      </div>
    </div>
    
    <!-- 实名认证弹窗 -->
    <div v-if="showRealName" class="modal-overlay" @click.self="showRealName = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>实名认证</h3>
          <button class="close-btn" @click="showRealName = false">✕</button>
        </div>
        <div class="modal-body">
          <div v-if="realNameStatus.status === 'verified'" class="verified-card">
            <strong>已完成实名认证</strong>
            <p>{{ realNameStatus.realNameMasked }} · {{ realNameStatus.idCardMasked }}</p>
            <p v-if="realNameStatus.region">{{ realNameStatus.region }}</p>
          </div>
          <template v-else>
            <p class="form-tip">仅用于身份证二要素认证，前端不保存身份证测试数据。</p>
            <div class="form-group">
              <label>真实姓名</label>
              <input v-model="realNameForm.name" class="input" placeholder="请输入真实姓名" autocomplete="off" />
            </div>
            <div class="form-group">
              <label>身份证号</label>
              <input v-model="realNameForm.idcard" class="input" placeholder="请输入身份证号" autocomplete="off" />
            </div>
          </template>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRealName = false">关闭</button>
          <button v-if="realNameStatus.status !== 'verified'" class="btn" :disabled="securityLoading" @click="submitRealName">提交认证</button>
        </div>
      </div>
    </div>

    <!-- 邮箱绑定弹窗 -->
    <div v-if="showBindEmail" class="modal-overlay" @click.self="showBindEmail = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>绑定邮箱</h3>
          <button class="close-btn" @click="showBindEmail = false">✕</button>
        </div>
        <div class="modal-body">
          <p v-if="user.emailVerified" class="form-tip">当前已绑定：{{ user.email }}</p>
          <div class="form-group">
            <label>邮箱</label>
            <input v-model="emailForm.email" type="email" class="input" placeholder="请输入邮箱地址" autocomplete="email" />
          </div>
          <div class="form-group code-row">
            <div class="code-input">
              <label>验证码</label>
              <input v-model="emailForm.code" class="input" placeholder="请输入验证码" autocomplete="one-time-code" />
            </div>
            <button class="btn btn-secondary" :disabled="securityLoading" @click="sendBindEmailCode">发送验证码</button>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showBindEmail = false">取消</button>
          <button class="btn" :disabled="securityLoading" @click="confirmBindEmail">确认绑定</button>
        </div>
      </div>
    </div>
    
    <!-- 通知设置弹窗 -->
    <div v-if="showNotification" class="modal-overlay" @click.self="showNotification = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>通知设置</h3>
          <button class="close-btn" @click="showNotification = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">好友验证</span>
              <span class="setting-desc">是否需要验证才能添加好友</span>
            </div>
            <div class="toggle-btn" :class="{ active: notificationSettings.friendVerification }" @click="toggleSetting('friendVerification')"></div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">桌面通知</span>
              <span class="setting-desc">收到消息时显示桌面通知</span>
            </div>
            <div class="toggle-btn" :class="{ active: notificationSettings.desktopNotifications }" @click="toggleSetting('desktopNotifications')"></div>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <span class="setting-label">声音提醒</span>
              <span class="setting-desc">收到消息时播放提示音</span>
            </div>
            <div class="toggle-btn" :class="{ active: notificationSettings.soundNotifications }" @click="toggleSetting('soundNotifications')"></div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showNotification = false">取消</button>
          <button class="btn btn-primary" @click="handleSaveNotification">保存</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { userApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import { formatDateTime } from '@/utils/datetime';
import AppLayout from '@/components/AppLayout.vue';
import AvatarComponent from '@/components/AvatarComponent.vue';

const router = useRouter();
const userStore = useUserStore();
const toastStore = useToastStore();

const user = ref({});
const stats = ref({
  friendCount: 0,
  groupCount: 0,
  momentCount: 0
});

const showEditProfile = ref(false);
const showChangePassword = ref(false);
const showNotification = ref(false);
const showRealName = ref(false);
const showBindEmail = ref(false);
const securityLoading = ref(false);

const realNameStatus = ref({
  status: 'unverified',
  realNameMasked: '',
  idCardMasked: '',
  gender: '',
  birthday: '',
  region: ''
});

const realNameForm = ref({
  name: '',
  idcard: ''
});

const emailForm = ref({
  email: '',
  code: ''
});

const editForm = ref({
  nickname: '',
  signature: ''
});

const passwordForm = ref({
  oldPassword: '',
  newPassword: '',
  confirmPassword: ''
});

const notificationSettings = ref({
  friendVerification: true,
  desktopNotifications: true,
  soundNotifications: true
});

async function loadUserInfo() {
  const res = await userApi.getInfo({ id: userStore.user?.id });
  if (res.ok) {
    user.value = res.data;
    editForm.value = {
      nickname: user.value.nickname || '',
      signature: user.value.signature || ''
    };
    notificationSettings.value = {
      friendVerification: user.value.friendVerification !== false,
      desktopNotifications: user.value.desktopNotifications !== false,
      soundNotifications: user.value.soundNotifications !== false
    };
    emailForm.value.email = user.value.email || '';
  }
}

async function loadRealNameStatus() {
  const res = await userApi.getRealNameStatus();
  if (res.ok) {
    realNameStatus.value = {
      status: res.data?.status || 'unverified',
      realNameMasked: res.data?.realNameMasked || '',
      idCardMasked: res.data?.idCardMasked || '',
      gender: res.data?.gender || '',
      birthday: res.data?.birthday || '',
      region: res.data?.region || ''
    };
  }
}

async function loadStats() {
  const res = await userApi.getStats();
  if (res.ok) {
    stats.value = {
      friendCount: res.data.friendCount || 0,
      groupCount: res.data.groupCount || 0,
      momentCount: res.data.momentCount || 0
    };
  }
}

async function handleSaveProfile() {
  const res = await userApi.update(editForm.value);
  if (res.ok) {
    toastStore.success('保存成功');
    showEditProfile.value = false;
    await loadUserInfo();
  } else {
    toastStore.error(res.msg || '保存失败');
  }
}

function changePassword() {
  showChangePassword.value = true;
}

async function handleChangePassword() {
  if (passwordForm.value.newPassword !== passwordForm.value.confirmPassword) {
    toastStore.error('两次输入的密码不一致');
    return;
  }
  
  const res = await userApi.updatePassword(passwordForm.value.oldPassword, passwordForm.value.newPassword);
  
  if (res.ok) {
    toastStore.success('密码修改成功');
    showChangePassword.value = false;
    passwordForm.value = {
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
  } else {
    toastStore.error(res.msg || '修改失败');
  }
}

function toggleSetting(key) {
  notificationSettings.value[key] = !notificationSettings.value[key];
}

async function handleSaveNotification() {
  const res = await userApi.update(notificationSettings.value);
  if (res.ok) {
    toastStore.success('设置已保存');
    showNotification.value = false;
    await loadUserInfo();
  } else {
    toastStore.error(res.msg || '保存失败');
  }
}

async function submitRealName() {
  if (!realNameForm.value.name.trim() || !realNameForm.value.idcard.trim()) {
    toastStore.warning('请填写真实姓名和身份证号');
    return;
  }

  securityLoading.value = true;
  try {
    const res = await userApi.submitRealName(realNameForm.value);
    if (res.ok) {
      toastStore.success('实名认证成功');
      showRealName.value = false;
      realNameForm.value = { name: '', idcard: '' };
      await Promise.all([loadRealNameStatus(), loadUserInfo()]);
    } else {
      toastStore.error(res.msg || '认证失败');
    }
  } finally {
    securityLoading.value = false;
  }
}

async function sendBindEmailCode() {
  if (!emailForm.value.email.trim()) {
    toastStore.warning('请输入邮箱地址');
    return;
  }

  securityLoading.value = true;
  try {
    const res = await userApi.sendBindEmailCode(emailForm.value.email);
    if (res.ok) {
      toastStore.success(res.msg || '验证码已发送');
    } else {
      toastStore.error(res.msg || '发送失败');
    }
  } finally {
    securityLoading.value = false;
  }
}

async function confirmBindEmail() {
  if (!emailForm.value.email.trim() || !emailForm.value.code.trim()) {
    toastStore.warning('请填写邮箱和验证码');
    return;
  }

  securityLoading.value = true;
  try {
    const res = await userApi.confirmBindEmail(emailForm.value);
    if (res.ok) {
      toastStore.success('邮箱绑定成功');
      showBindEmail.value = false;
      emailForm.value.code = '';
      await loadUserInfo();
      await userStore.refreshUserInfo();
    } else {
      toastStore.error(res.msg || '绑定失败');
    }
  } finally {
    securityLoading.value = false;
  }
}

async function copyInvitationCode() {
  try {
    await navigator.clipboard.writeText(user.value.invitationCode);
    toastStore.success('邀请码已复制');
  } catch (e) {
    toastStore.error('复制失败');
  }
}

function handleLogout() {
  userStore.logout();
  router.push('/login');
}

onMounted(async () => {
  await Promise.all([loadUserInfo(), loadStats(), loadRealNameStatus()]);
});
</script>

<style lang="scss" scoped>
.profile-view {
  padding: 20px;
  max-width: 600px;
  margin: 0 auto;
  height: 100%;
  overflow-y: auto;
}

.profile-header {
  text-align: center;
  margin-bottom: 32px;
}

.profile-cover {
  height: 160px;
  border-radius: var(--radius-lg);
  overflow: hidden;
  margin-bottom: -50px;
  z-index: 1;
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  
  .cover-icon {
    font-size: 48px;
    opacity: 0.5;
  }
}

.profile-info {
  position: relative;
  z-index: 2;
  padding-top: 60px;
}

.profile-avatar {
  margin-bottom: 12px;
}

.profile-name {
  margin: 0 0 4px;
  font-size: 24px;
  font-weight: 700;
  color: var(--text-primary);
}

.profile-id {
  margin: 0;
  font-size: 13px;
  color: var(--text-muted);
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.security-notice {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  background: rgba(244, 231, 220, 0.86);
  border: 1px solid rgba(197, 138, 58, 0.28);
  border-radius: var(--radius-lg);

  .notice-icon {
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
  }
}

.section {
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.section-title {
  margin: 0 0 16px;
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border);
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
}

.info-label {
  font-size: 14px;
  color: var(--text-secondary);
}

.info-value {
  font-size: 14px;
  color: var(--text-primary);
}

.invitation-code {
  display: flex;
  align-items: center;
  gap: 8px;
  
  .copy-btn {
    padding: 4px 12px;
    background: var(--primary);
    color: white;
    border: none;
    border-radius: var(--radius-sm);
    font-size: 12px;
    cursor: pointer;
    
    &:hover {
      opacity: 0.9;
    }
  }
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--primary);
}

.stat-label {
  font-size: 13px;
  color: var(--text-secondary);
}

.settings-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  &.logout-btn {
    color: var(--danger);
    
    &:hover {
      background: rgba(239, 68, 68, 0.1);
    }
  }
}

.settings-icon {
  font-size: 18px;
}

.settings-text {
  flex: 1;
  text-align: left;
  font-size: 14px;
  color: var(--text-primary);
}

.settings-arrow {
  font-size: 18px;
  color: var(--text-muted);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  width: 400px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
  }
}

.close-btn {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: var(--radius-md);
  background: var(--bg-hover);
  font-size: 14px;
  cursor: pointer;
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 16px;
  
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 8px;
  }
  
  .input {
    width: 100%;
    padding: 10px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius-md);
    font-size: 14px;
    outline: none;
    transition: all var(--transition-base);
    
    &:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(154, 106, 79, 0.14);
    }
  }
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
}

.setting-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.setting-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-desc {
  font-size: 12px;
  color: var(--text-muted);
}

.toggle-btn {
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: #ccc;
  position: relative;
  cursor: pointer;
  transition: background 0.3s;
  
  &::after {
    content: '';
    position: absolute;
    top: 2px;
    left: 2px;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: white;
    transition: transform 0.3s;
  }
  
  &.active {
    background: var(--primary);
    
    &::after {
      transform: translateX(20px);
    }
  }
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.btn {
  padding: 10px 24px;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-base);
  
  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }
  
  &.btn-primary {
    background: var(--gradient-primary);
    color: white;
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
  }
}

.form-tip {
  margin: 0 0 14px;
  color: var(--text-secondary);
  line-height: 1.6;
}

.verified-card {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-secondary);

  p {
    margin: 8px 0 0;
    color: var(--text-secondary);
  }
}

.code-row {
  display: flex;
  align-items: flex-end;
  gap: 12px;

  .code-input {
    flex: 1;
  }
}
</style>
