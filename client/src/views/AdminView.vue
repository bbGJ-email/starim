<template>
  <AppLayout>
    <div class="admin-view">
      <div class="admin-header">
        <h2>管理中心</h2>
        <span class="admin-badge">管理员</span>
      </div>
      
      <div class="admin-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'users' }"
          @click="activeTab = 'users'"
        >
          用户管理
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'reports' }"
          @click="activeTab = 'reports'"
        >
          举报管理
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'feedbacks' }"
          @click="activeTab = 'feedbacks'"
        >
          反馈管理
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'system' }"
          @click="activeTab = 'system'"
        >
          系统设置
        </button>
      </div>
      
      <!-- 用户管理 -->
      <div v-if="activeTab === 'users'" class="admin-content">
        <div class="search-bar">
          <input
            v-model="searchKeyword"
            type="text"
            class="input"
            placeholder="搜索用户名或ID"
          />
          <select v-model="filterRole" class="select">
            <option value="">全部角色</option>
            <option value="user">普通用户</option>
            <option value="admin">管理员</option>
          </select>
          <select v-model="filterStatus" class="select">
            <option value="">全部状态</option>
            <option value="active">正常</option>
            <option value="banned">已封禁</option>
          </select>
        </div>
        
        <div class="table-container">
          <table class="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>用户名</th>
                <th>昵称</th>
                <th>角色</th>
                <th>状态</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="user in filteredUsers" :key="user.id">
                <td>{{ user.id }}</td>
                <td>{{ user.username }}</td>
                <td>{{ user.nickname || '-' }}</td>
                <td>
                  <span :class="['role-tag', user.isAdmin ? 'admin' : 'user']">{{ user.isAdmin ? '管理员' : '普通用户' }}</span>
                </td>
                <td>
                  <span :class="['status-tag', user.isBanned ? 'banned' : 'active']">{{ user.isBanned ? '已封禁' : '正常' }}</span>
                </td>
                <td>{{ formatDateTime(user.createdAt) }}</td>
                <td class="actions">
                  <button
                    v-if="!user.isBanned"
                    class="action-btn btn-danger"
                    @click="toggleBan(user)"
                  >
                    封禁
                  </button>
                  <button
                    v-else
                    class="action-btn btn-success"
                    @click="toggleBan(user)"
                  >
                    解封
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="filteredUsers.length === 0" class="empty-state">
            <p>没有找到用户</p>
          </div>
        </div>
      </div>
      
      <!-- 举报管理 -->
      <div v-if="activeTab === 'reports'" class="admin-content">
        <div class="search-bar">
          <select v-model="reportFilter" class="select">
            <option value="">全部类型</option>
            <option value="spam">垃圾信息</option>
            <option value="abuse">辱骂</option>
            <option value="porn">色情</option>
            <option value="other">其他</option>
          </select>
          <select v-model="reportStatus" class="select">
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="resolved">已处理</option>
          </select>
        </div>
        
        <div class="report-list">
          <div
            v-for="report in filteredReports"
            :key="report.id"
            class="report-card"
          >
            <div class="report-header">
              <span class="report-type">{{ getReportTypeLabel(report.type) }}</span>
              <span :class="['report-status', report.status]">
                {{ report.status === 'pending' ? '待处理' : '已处理' }}
              </span>
            </div>
            <div class="report-content">
              <p>{{ report.content }}</p>
            </div>
            <div class="report-info">
              <span>举报者: {{ report.reporter?.username }}</span>
              <span>被举报者: {{ report.target?.username }}</span>
              <span>{{ formatDateTime(report.createdAt) }}</span>
            </div>
            <div class="report-actions">
              <button
                v-if="report.status === 'pending'"
                class="btn btn-primary btn-sm"
                @click="handleReport(report, 'resolved')"
              >
                处理完成
              </button>
              <button
                v-if="report.status === 'pending'"
                class="btn btn-secondary btn-sm"
                @click="handleReport(report, 'ignored')"
              >
                忽略
              </button>
            </div>
          </div>
          
          <div v-if="filteredReports.length === 0" class="empty-state">
            <p>暂无举报</p>
          </div>
        </div>
      </div>
      
      <!-- 反馈管理 -->
      <div v-if="activeTab === 'feedbacks'" class="admin-content">
        <div class="search-bar">
          <select v-model="feedbackType" class="select">
            <option value="">全部类型</option>
            <option value="bug">发现bug</option>
            <option value="feature">新功能建议</option>
            <option value="suggestion">改进建议</option>
            <option value="other">其他</option>
          </select>
          <select v-model="feedbackStatus" class="select">
            <option value="">全部状态</option>
            <option value="pending">待处理</option>
            <option value="processing">处理中</option>
            <option value="resolved">已解决</option>
            <option value="rejected">已拒绝</option>
          </select>
        </div>
        
        <div class="feedback-list">
          <div
            v-for="feedback in filteredFeedbacks"
            :key="feedback.id"
            class="feedback-card"
          >
            <div class="feedback-header">
              <div class="feedback-title-row">
                <span :class="['feedback-type', feedback.type]">{{ getFeedbackTypeLabel(feedback.type) }}</span>
                <span class="feedback-subject">{{ feedback.title }}</span>
              </div>
              <span :class="['feedback-status', feedback.status]">
                {{ getFeedbackStatusLabel(feedback.status) }}
              </span>
            </div>
            <div class="feedback-content">
              <p>{{ feedback.content }}</p>
              <div v-if="feedback.screenshots?.length > 0" class="screenshot-preview">
                <span class="screenshot-label">截图：</span>
                <span class="screenshot-count">{{ feedback.screenshots.length }} 张</span>
              </div>
            </div>
            <div v-if="feedback.reply" class="feedback-reply">
              <span class="reply-label">管理员回复：</span>
              <span class="reply-text">{{ feedback.reply }}</span>
            </div>
            <div class="feedback-info">
              <span>反馈者: {{ feedback.username || feedback.nickname || '未知用户' }}</span>
              <span>提交时间: {{ formatDateTime(feedback.createdAt) }}</span>
              <span v-if="feedback.updatedAt && feedback.updatedAt !== feedback.createdAt">
                更新时间: {{ formatDateTime(feedback.updatedAt) }}
              </span>
            </div>
            <div class="feedback-actions">
              <button
                v-if="feedback.status === 'pending' || feedback.status === 'processing'"
                class="btn btn-primary btn-sm"
                @click="openReplyModal(feedback)"
              >
                回复
              </button>
            </div>
          </div>
          
          <div v-if="filteredFeedbacks.length === 0" class="empty-state">
            <p>暂无反馈</p>
          </div>
        </div>
      </div>
      
      <!-- 系统设置 -->
      <div v-if="activeTab === 'system'" class="admin-content">
        <div class="system-info">
          <h3>系统信息</h3>
          <div class="info-grid">
            <div class="info-box">
              <span class="info-label">在线用户</span>
              <span class="info-value">{{ systemStats.onlineCount }}</span>
            </div>
            <div class="info-box">
              <span class="info-label">总用户数</span>
              <span class="info-value">{{ systemStats.totalUsers }}</span>
            </div>
            <div class="info-box">
              <span class="info-label">消息总数</span>
              <span class="info-value">{{ systemStats.totalMessages }}</span>
            </div>
            <div class="info-box">
              <span class="info-label">群组总数</span>
              <span class="info-value">{{ systemStats.totalGroups }}</span>
            </div>
          </div>
        </div>
        
        <div class="system-actions">
          <h3>系统操作</h3>
          <button class="btn btn-danger" @click="clearLogs">
            🗑️ 清空日志
          </button>
          <button class="btn btn-secondary" @click="refreshCache">
            🔄 刷新缓存
          </button>
        </div>
      </div>
    </div>
    
    <!-- 回复模态框 -->
    <div v-if="showReplyModal" class="modal-overlay" @click.self="showReplyModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>回复反馈</h3>
          <button class="close-btn" @click="showReplyModal = false">×</button>
        </div>
        <div class="modal-body">
          <div class="feedback-preview">
            <div class="preview-label">反馈内容：</div>
            <div class="preview-content">{{ selectedFeedback?.title }}</div>
            <div class="preview-detail">{{ selectedFeedback?.content }}</div>
          </div>
          <div class="form-group">
            <label>处理状态</label>
            <select v-model="replyStatus" class="select">
              <option value="processing">处理中</option>
              <option value="resolved">已解决</option>
              <option value="rejected">已拒绝</option>
            </select>
          </div>
          <div class="form-group">
            <label>回复内容</label>
            <textarea
              v-model="replyText"
              class="textarea"
              rows="4"
              placeholder="输入回复内容..."
            ></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showReplyModal = false">取消</button>
          <button class="btn btn-primary" @click="submitReply">提交</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { adminApi, reportApi, feedbackApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import { formatDateTime } from '@/utils/datetime';
import AppLayout from '@/components/AppLayout.vue';

const toastStore = useToastStore();

const activeTab = ref('users');
const searchKeyword = ref('');
const filterRole = ref('');
const filterStatus = ref('');
const reportFilter = ref('');
const reportStatus = ref('');
const feedbackType = ref('');
const feedbackStatus = ref('');
const showReplyModal = ref(false);
const selectedFeedback = ref(null);
const replyStatus = ref('resolved');
const replyText = ref('');

const users = ref([]);
const reports = ref([]);
const feedbacks = ref([]);
const systemStats = ref({
  onlineCount: 0,
  totalUsers: 0,
  totalMessages: 0,
  totalGroups: 0
});

const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchKeyword = !searchKeyword.value ||
      user.username.toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
      user.id.toString().includes(searchKeyword.value);
    const userRole = user.role || (user.isAdmin ? 'admin' : 'user');
    const matchRole = !filterRole.value || userRole === filterRole.value;
    const userStatus = user.status || (user.isBanned ? 'banned' : 'active');
    const matchStatus = !filterStatus.value || userStatus === filterStatus.value;
    return matchKeyword && matchRole && matchStatus;
  });
});

const filteredReports = computed(() => {
  return reports.value.filter(report => {
    const matchType = !reportFilter.value || report.type === reportFilter.value;
    const matchStatus = !reportStatus.value || report.status === reportStatus.value;
    return matchType && matchStatus;
  });
});

const filteredFeedbacks = computed(() => {
  return feedbacks.value.filter(feedback => {
    const matchType = !feedbackType.value || feedback.type === feedbackType.value;
    const matchStatus = !feedbackStatus.value || feedback.status === feedbackStatus.value;
    return matchType && matchStatus;
  });
});

function getReportTypeLabel(type) {
  const types = {
    spam: '垃圾信息',
    abuse: '辱骂',
    porn: '色情',
    other: '其他'
  };
  return types[type] || type;
}

function getFeedbackTypeLabel(type) {
  const types = {
    bug: '发现bug',
    feature: '新功能建议',
    suggestion: '改进建议',
    other: '其他'
  };
  return types[type] || type;
}

function getFeedbackStatusLabel(status) {
  const statuses = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    rejected: '已拒绝'
  };
  return statuses[status] || status;
}

async function loadFeedbacks() {
  const res = await feedbackApi.getAll(1, 50);
  if (res.ok) {
    feedbacks.value = res.data;
  }
}

function openReplyModal(feedback) {
  selectedFeedback.value = feedback;
  replyStatus.value = feedback.status === 'pending' ? 'processing' : feedback.status;
  replyText.value = feedback.reply || '';
  showReplyModal.value = true;
}

async function submitReply() {
  if (!selectedFeedback.value || !replyText.value.trim()) {
    toastStore.error('请输入回复内容');
    return;
  }
  
  const res = await feedbackApi.handle({
    id: selectedFeedback.value.id,
    status: replyStatus.value,
    reply: replyText.value.trim()
  });
  
  if (res.ok) {
    toastStore.success('回复成功');
    selectedFeedback.value.status = replyStatus.value;
    selectedFeedback.value.reply = replyText.value.trim();
    showReplyModal.value = false;
  } else {
    toastStore.error(res.msg || '回复失败');
  }
}

async function loadUsers() {
  const res = await adminApi.getUsers(1, 50);
  if (res.ok) {
    users.value = res.data;
  }
}

async function loadReports() {
  const res = await reportApi.getList({});
  if (res.ok) {
    reports.value = res.data;
  }
}

async function loadSystemStats() {
  const res = await adminApi.getStats();
  if (res.ok) {
    systemStats.value = {
      onlineCount: res.data.onlineCount || 0,
      totalUsers: res.data.totalUsers || 0,
      totalMessages: res.data.totalMessages || 0,
      totalGroups: res.data.totalGroups || 0
    };
  }
}

async function toggleBan(user) {
  const isBanned = user.isBanned;
  const res = await adminApi.toggleBan(user.id, !isBanned);
  if (res.ok) {
    user.isBanned = !isBanned;
    toastStore.success(user.isBanned ? '封禁成功' : '解封成功');
  } else {
    toastStore.error(res.msg || '操作失败');
  }
}

async function handleReport(report, status) {
  const res = await adminApi.handleReport({ reportId: report.id, status });
  if (res.ok) {
    report.status = 'resolved';
    toastStore.success('处理成功');
  } else {
    toastStore.error(res.msg || '处理失败');
  }
}

async function clearLogs() {
  const res = await adminApi.clearLogs();
  if (res.ok) {
    toastStore.success('日志已清空');
  } else {
    toastStore.error(res.msg || '操作失败');
  }
}

async function refreshCache() {
  const res = await adminApi.refreshCache();
  if (res.ok) {
    toastStore.success('缓存已刷新');
  } else {
    toastStore.error(res.msg || '操作失败');
  }
}

onMounted(async () => {
  await loadUsers();
  await loadReports();
  await loadFeedbacks();
  await loadSystemStats();
});
</script>

<style lang="scss" scoped>
.admin-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.admin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  h2 {
    margin: 0;
    font-size: 22px;
    font-weight: 700;
    color: var(--text-primary);
  }
}

.admin-badge {
  padding: 4px 12px;
  background: var(--danger);
  color: white;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
}

.admin-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  padding: 10px 24px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--primary-container);
    color: var(--primary-dark);
  }
}

.admin-content {
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg);
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.search-bar {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  
  &:focus {
    border-color: var(--primary);
  }
}

.select {
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  background: white;
  
  &:focus {
    border-color: var(--primary);
  }
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  
  th, td {
    padding: 12px;
    text-align: left;
    border-bottom: 1px solid var(--border);
    font-size: 14px;
  }
  
  th {
    background: var(--bg-secondary);
    font-weight: 600;
    color: var(--text-secondary);
  }
}

.role-tag,
.status-tag {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 12px;
  font-weight: 500;
  
  &.admin {
    background: rgba(154, 106, 79, 0.14);
    color: var(--primary);
  }
  
  &.user {
    background: var(--bg-secondary);
    color: var(--text-secondary);
  }
  
  &.active {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
  }
  
  &.banned {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger);
  }
}

.actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  padding: 6px 12px;
  border-radius: var(--radius-sm);
  font-size: 12px;
  font-weight: 500;
  border: none;
  cursor: pointer;
  transition: all var(--transition-base);
  
  &.btn-danger {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger);
    
    &:hover {
      background: rgba(239, 68, 68, 0.25);
    }
  }
  
  &.btn-success {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
    
    &:hover {
      background: rgba(34, 197, 94, 0.25);
    }
  }
}

.empty-state {
  text-align: center;
  padding: 40px;
  color: var(--text-muted);
}

.report-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.report-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.report-type {
  padding: 4px 10px;
  background: var(--primary-container);
  color: var(--primary-dark);
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
}

.report-status {
  font-size: 12px;
  font-weight: 500;
  
  &.pending {
    color: var(--warning);
  }
  
  &.resolved {
    color: var(--success);
  }
}

.report-content {
  margin-bottom: 12px;
  
  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.5;
  }
}

.report-info {
  display: flex;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.report-actions {
  display: flex;
  gap: 12px;
}

.system-info {
  margin-bottom: 24px;
  
  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}

.info-box {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  text-align: center;
  
  .info-label {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
    margin-bottom: 8px;
  }
  
  .info-value {
    display: block;
    font-size: 24px;
    font-weight: 700;
    color: var(--primary);
  }
}

.system-actions {
  h3 {
    margin: 0 0 16px;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .btn {
    margin-right: 12px;
    padding: 10px 20px;
    border-radius: var(--radius-md);
    font-weight: 500;
    cursor: pointer;
    border: none;
    transition: all var(--transition-base);
    
    &.btn-danger {
      background: rgba(239, 68, 68, 0.15);
      color: var(--danger);
      
      &:hover {
        background: rgba(239, 68, 68, 0.25);
      }
    }
    
    &.btn-secondary {
      background: var(--bg-secondary);
      color: var(--text-secondary);
      
      &:hover {
        background: var(--bg-hover);
      }
    }
  }
}

.btn-sm {
  padding: 6px 16px;
  font-size: 13px;
}

.feedback-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.feedback-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--primary);
  
  &:hover {
    background: var(--bg-hover);
  }
}

.feedback-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
  flex-wrap: wrap;
  gap: 8px;
}

.feedback-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.feedback-type {
  padding: 4px 10px;
  font-size: 12px;
  font-weight: 500;
  border-radius: var(--radius-full);
  
  &.bug {
    background: rgba(239, 68, 68, 0.15);
    color: var(--danger);
  }
  
  &.feature {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
  }
  
  &.suggestion {
    background: rgba(154, 106, 79, 0.14);
    color: var(--primary);
  }
  
  &.other {
    background: var(--bg-primary);
    color: var(--text-secondary);
  }
}

.feedback-subject {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.feedback-status {
  font-size: 12px;
  font-weight: 500;
  padding: 4px 10px;
  border-radius: var(--radius-full);
  
  &.pending {
    background: rgba(251, 191, 36, 0.15);
    color: var(--warning);
  }
  
  &.processing {
    background: rgba(154, 106, 79, 0.14);
    color: var(--primary);
  }
  
  &.resolved {
    background: rgba(34, 197, 94, 0.15);
    color: var(--success);
  }
  
  &.rejected {
    background: rgba(156, 163, 175, 0.15);
    color: var(--text-muted);
  }
}

.feedback-content {
  margin-bottom: 12px;
  
  p {
    margin: 0;
    font-size: 14px;
    color: var(--text-primary);
    line-height: 1.6;
  }
}

.screenshot-preview {
  margin-top: 8px;
  font-size: 13px;
  color: var(--text-muted);
}

.screenshot-label {
  font-weight: 500;
}

.screenshot-count {
  color: var(--primary);
}

.feedback-reply {
  padding: 12px;
  background: rgba(154, 106, 79, 0.08);
  border-radius: var(--radius-md);
  margin-bottom: 12px;
}

.reply-label {
  display: block;
  font-size: 12px;
  font-weight: 600;
  color: var(--primary-dark);
  margin-bottom: 4px;
}

.reply-text {
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.feedback-info {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-bottom: 12px;
  font-size: 12px;
  color: var(--text-muted);
}

.feedback-actions {
  display: flex;
  gap: 12px;
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

.modal {
  background: white;
  border-radius: var(--radius-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border);
  
  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
  }
}

.close-btn {
  background: none;
  border: none;
  font-size: 24px;
  color: var(--text-muted);
  cursor: pointer;
  line-height: 1;
  
  &:hover {
    color: var(--text-primary);
  }
}

.modal-body {
  padding: 20px;
}

.feedback-preview {
  background: var(--bg-secondary);
  padding: 12px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
}

.preview-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  margin-bottom: 6px;
}

.preview-content {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 4px;
}

.preview-detail {
  font-size: 14px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.form-group {
  margin-bottom: 16px;
  
  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
}

.textarea {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  resize: vertical;
  outline: none;
  font-family: inherit;
  
  &:focus {
    border-color: var(--primary);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border);
}

.btn {
  padding: 10px 20px;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  transition: all var(--transition-base);
  
  &.btn-primary {
    background: var(--primary);
    color: white;
    
    &:hover {
      background: var(--primary-dark);
    }
  }
  
  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    
    &:hover {
      background: var(--bg-hover);
    }
  }
}
</style>