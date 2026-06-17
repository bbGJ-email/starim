<template>
  <AppLayout>
    <div class="public-accounts-view">
      <div class="page-header">
        <div>
          <h2>公众号</h2>
          <p>发现和订阅感兴趣的公共账号</p>
        </div>
        <button class="btn" @click="showRegister = true">注册公众号</button>
      </div>

      <div v-if="!realNameVerified" class="notice-card">
        <span class="notice-icon">🍂</span>
        <div>
          <strong>实名认证未完成</strong>
          <p>你仍可浏览和订阅公众号，完成实名后账号可信度会更高。</p>
        </div>
        <button class="btn btn-secondary btn-sm" @click="router.push('/profile')">去认证</button>
      </div>

      <div class="content-grid">
        <section class="account-list card">
          <div class="section-head">
            <h3>全部公众号</h3>
            <span>{{ accounts.length }} 个</span>
          </div>
          <div class="search-box">
            <input v-model="keyword" class="input" placeholder="搜索公众号名称或简介" />
          </div>

          <div v-if="loading" class="empty-state">正在加载...</div>
          <div v-else-if="filteredAccounts.length === 0" class="empty-state">
            <div class="empty-icon">📮</div>
            <p>{{ keyword ? '没有匹配的公众号' : '暂无公众号，来注册第一个吧' }}</p>
          </div>
          <template v-else>
            <button
              v-for="account in filteredAccounts"
              :key="account.id"
              class="account-item"
              :class="{ active: selectedAccount?.id === account.id }"
              @click="selectAccount(account.id)"
            >
              <AvatarComponent :src="account.avatar" :name="account.name" size="md" />
              <div class="account-summary">
                <strong>{{ account.name }}</strong>
                <span>{{ account.description || '这个公众号还没有简介' }}</span>
              </div>
              <span class="follow-count">{{ account.followerCount || 0 }}</span>
            </button>
          </template>
        </section>

        <section class="account-detail card">
          <template v-if="selectedAccount">
            <div class="detail-top">
              <AvatarComponent :src="selectedAccount.avatar" :name="selectedAccount.name" size="lg" />
              <div class="detail-title">
                <h3>{{ selectedAccount.name }}</h3>
                <span>ID: {{ selectedAccount.id }}</span>
              </div>
              <span v-if="selectedAccount.isOwner" class="badge badge-warning">我创建的</span>
              <span v-else-if="selectedAccount.subscribed" class="badge badge-success">已订阅</span>
            </div>
            <p class="detail-desc">{{ selectedAccount.description || '这个公众号还没有填写简介。' }}</p>
            <div class="detail-stats">
              <div>
                <strong>{{ selectedAccount.followerCount || 0 }}</strong>
                <span>订阅者</span>
              </div>
              <div>
                <strong>{{ formatDate(selectedAccount.createdAt) }}</strong>
                <span>创建时间</span>
              </div>
            </div>
            <div class="detail-actions">
              <button
                v-if="!selectedAccount.isOwner && !selectedAccount.subscribed"
                class="btn"
                :disabled="actionLoading"
                @click="subscribe(selectedAccount.id)"
              >
                订阅
              </button>
              <button
                v-if="!selectedAccount.isOwner && selectedAccount.subscribed"
                class="btn btn-secondary"
                :disabled="actionLoading"
                @click="unsubscribe(selectedAccount.id)"
              >
                取消订阅
              </button>
            </div>
          </template>
          <div v-else class="empty-state detail-empty">
            <div class="empty-icon">🌿</div>
            <p>选择一个公众号查看详情</p>
          </div>
        </section>
      </div>
    </div>

    <div v-if="showRegister" class="modal-overlay" @click.self="showRegister = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>注册公众号</h3>
          <button class="close-btn" @click="showRegister = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>名称</label>
            <input v-model="registerForm.name" class="input" maxlength="30" placeholder="请输入公众号名称" />
          </div>
          <div class="form-group">
            <label>头像 URL</label>
            <input v-model="registerForm.avatar" class="input" placeholder="可选，粘贴图片地址" />
          </div>
          <div class="form-group">
            <label>简介</label>
            <textarea v-model="registerForm.description" class="input" rows="4" maxlength="200" placeholder="介绍一下公众号内容"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showRegister = false">取消</button>
          <button class="btn" :disabled="actionLoading" @click="registerAccount">提交注册</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { publicAccountApi, userApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import AppLayout from '@/components/AppLayout.vue';
import AvatarComponent from '@/components/AvatarComponent.vue';

const router = useRouter();
const toastStore = useToastStore();

const accounts = ref([]);
const selectedAccount = ref(null);
const keyword = ref('');
const loading = ref(false);
const actionLoading = ref(false);
const showRegister = ref(false);
const realNameVerified = ref(true);
const registerForm = ref({ name: '', avatar: '', description: '' });

const filteredAccounts = computed(() => {
  const value = keyword.value.trim().toLowerCase();
  if (!value) return accounts.value;
  return accounts.value.filter((account) =>
    `${account.name || ''} ${account.description || ''}`.toLowerCase().includes(value)
  );
});

async function loadAccounts(keepSelectedId = selectedAccount.value?.id) {
  loading.value = true;
  try {
    const res = await publicAccountApi.getList();
    if (res.ok) {
      accounts.value = res.data || [];
      selectedAccount.value = accounts.value.find((item) => item.id === keepSelectedId) || accounts.value[0] || null;
    }
  } finally {
    loading.value = false;
  }
}

async function selectAccount(id) {
  const res = await publicAccountApi.getDetail(id);
  if (res.ok) {
    selectedAccount.value = res.data;
  }
}

async function registerAccount() {
  if (!registerForm.value.name.trim()) {
    toastStore.warning('请输入公众号名称');
    return;
  }
  actionLoading.value = true;
  try {
    const res = await publicAccountApi.register(registerForm.value);
    if (res.ok) {
      toastStore.success('公众号注册成功');
      showRegister.value = false;
      registerForm.value = { name: '', avatar: '', description: '' };
      await loadAccounts(res.data?.id || res.id);
    } else {
      toastStore.error(res.msg || '注册失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

async function subscribe(id) {
  actionLoading.value = true;
  try {
    const res = await publicAccountApi.subscribe(id);
    if (res.ok) {
      toastStore.success('订阅成功');
      await loadAccounts(id);
    } else {
      toastStore.error(res.msg || '订阅失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

async function unsubscribe(id) {
  actionLoading.value = true;
  try {
    const res = await publicAccountApi.unsubscribe(id);
    if (res.ok) {
      toastStore.success('已取消订阅');
      await loadAccounts(id);
    } else {
      toastStore.error(res.msg || '操作失败');
    }
  } finally {
    actionLoading.value = false;
  }
}

async function loadRealNameStatus() {
  const res = await userApi.getRealNameStatus();
  if (res.ok) {
    realNameVerified.value = res.data?.status === 'verified';
  }
}

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString();
}

onMounted(async () => {
  await Promise.all([loadAccounts(), loadRealNameStatus()]);
});
</script>

<style lang="scss" scoped>
.public-accounts-view {
  height: 100%;
  padding: 20px;
  overflow-y: auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;

  h2 {
    margin: 0 0 6px;
    color: var(--text-primary);
  }

  p {
    margin: 0;
    color: var(--text-secondary);
  }
}

.notice-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 16px;
  margin-bottom: 16px;
  border: 1px solid rgba(197, 138, 58, 0.28);
  border-radius: var(--radius-lg);
  background: rgba(244, 231, 220, 0.82);

  .notice-icon {
    font-size: 24px;
  }

  p {
    margin: 4px 0 0;
    color: var(--text-secondary);
  }
}

.content-grid {
  display: grid;
  grid-template-columns: minmax(280px, 380px) 1fr;
  gap: 16px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;

  h3 {
    margin: 0;
  }

  span {
    color: var(--text-muted);
  }
}

.search-box {
  margin-bottom: 12px;
}

.account-list,
.account-detail {
  min-height: 520px;
}

.account-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  margin-bottom: 8px;
  border: 1px solid transparent;
  border-radius: var(--radius-lg);
  background: transparent;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: all var(--transition-base);

  &:hover,
  &.active {
    border-color: var(--border);
    background: var(--bg-hover);
  }
}

.account-summary {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;

  span {
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.follow-count {
  color: var(--text-muted);
}

.detail-top {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 18px;
}

.detail-title {
  flex: 1;

  h3 {
    margin: 0 0 4px;
    font-size: 22px;
  }

  span {
    color: var(--text-muted);
  }
}

.detail-desc {
  padding: 16px;
  border-radius: var(--radius-lg);
  background: var(--bg-input);
  color: var(--text-secondary);
  line-height: 1.7;
}

.detail-stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin: 18px 0;

  div {
    padding: 14px;
    border-radius: var(--radius-lg);
    background: var(--secondary-container);
  }

  strong,
  span {
    display: block;
  }

  span {
    margin-top: 4px;
    color: var(--text-secondary);
  }
}

.detail-actions {
  display: flex;
  gap: 10px;
}

.empty-state {
  padding: 48px 16px;
  text-align: center;
  color: var(--text-muted);
}

.empty-icon {
  margin-bottom: 8px;
  font-size: 36px;
}

.detail-empty {
  height: 420px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;

  label {
    color: var(--text-secondary);
    font-weight: 500;
  }
}

@media (max-width: 900px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}
</style>
