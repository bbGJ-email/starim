<template>
  <div class="chat-panel">
    <!-- 聊天头部 -->
    <header class="chat-header">
      <div class="chat-header-info">
        <AvatarComponent
          :src="currentChat.info?.avatar"
          :name="chatName"
          size="md"
        />
        <div>
          <h3 class="chat-title">{{ chatName }}</h3>
          <p class="chat-meta">{{ chatMeta }}</p>
        </div>
      </div>
      <div class="chat-header-actions">
        <button class="icon-btn-sm" v-if="currentChat.type === 'private'" @click="startVoiceCall">
          📞
        </button>
        <button class="icon-btn-sm" @click="showSettings = true">
          ⋮
        </button>
      </div>
    </header>
    
    <!-- 消息区域 -->
    <div id="messageWindow" class="message-window" ref="messageWindow">
      <div v-if="messages.length === 0" class="empty-messages">
        <div class="empty-icon">💭</div>
        <p>还没有消息，发送第一条消息开始对话吧</p>
      </div>
      
      <MessageItem
        v-for="(message, index) in messages"
        :key="message.id || index"
        :message="message"
        :show-avatar="shouldShowAvatar(index)"
        @recall="handleRecall"
        @quote="handleQuote"
      />
    </div>
    
    <!-- 引用消息 -->
    <div v-if="quotedMessage" class="quoted-bar">
      <div class="quoted-content">
        <span class="quoted-label">回复:</span>
        <span class="quoted-text">{{ quotedMessage.content }}</span>
      </div>
      <button class="icon-btn-sm" @click="quotedMessage = null">✕</button>
    </div>
    
    <!-- 输入框 -->
    <div class="input-area">
      <div class="input-tools">
        <button class="tool-btn" @click="$refs.fileInput.click()" title="发送图片">📷</button>
        <input
          ref="fileInput"
          type="file"
          accept="image/*"
          @change="handleFileChange"
          style="display: none"
        />
        <button class="tool-btn" title="表情">😊</button>
      </div>
      
      <textarea
        v-model="messageContent"
        class="message-input"
        placeholder="输入消息..."
        rows="2"
        @keydown.enter.exact.prevent="handleSend"
        @keydown.enter.shift.exact.prevent="messageContent += '\n'"
      ></textarea>
      
      <button
        class="send-btn"
        :disabled="!messageContent.trim() || sending"
        @click="handleSend"
      >
        发送
      </button>
    </div>
    
    <!-- 设置弹窗 -->
    <div v-if="showSettings" class="modal-overlay" @click.self="showSettings = false">
      <div class="settings-modal">
        <div class="modal-header">
          <h3>{{ currentChat.type === 'group' ? '群设置' : '聊天设置' }}</h3>
          <button class="close-btn" @click="showSettings = false">✕</button>
        </div>
        <div class="modal-body">
          <!-- 群设置 -->
          <template v-if="currentChat.type === 'group'">
            <div class="setting-section">
              <h4 class="section-title">群信息</h4>
              <div class="setting-item">
                <span class="setting-label">群名称</span>
                <input
                  v-model="groupSettings.name"
                  class="setting-input"
                  :disabled="!canManageGroup"
                  :class="{ disabled: !canManageGroup }"
                  placeholder="输入群名称"
                />
                <span v-if="!canManageGroup" class="permission-tip">只有管理员可修改</span>
              </div>
              <div class="setting-item">
                <span class="setting-label">群公告</span>
                <textarea
                  v-model="groupSettings.announcement"
                  class="setting-textarea"
                  :disabled="!canManageGroup"
                  :class="{ disabled: !canManageGroup }"
                  placeholder="输入群公告"
                ></textarea>
                <span v-if="!canManageGroup" class="permission-tip">只有管理员可修改</span>
              </div>
            </div>
            
            <div class="setting-section">
              <h4 class="section-title">成员管理</h4>
              <div class="setting-item">
                <span class="setting-label">成员列表</span>
                <div class="setting-value">{{ currentChat.info?.membersCount || 0 }} 人</div>
              </div>
              <div class="setting-item">
                <span class="setting-label">添加成员</span>
                <button 
                  class="btn-secondary" 
                  @click="showAddMember = true"
                  :disabled="!canManageGroup"
                  :class="{ disabled: !canManageGroup }"
                >邀请好友</button>
                <span v-if="!canManageGroup" class="permission-tip">只有管理员可操作</span>
              </div>
            </div>
            
            <div class="setting-section">
              <h4 class="section-title">群管理</h4>
              <div class="setting-item">
                <span class="setting-label">消息免打扰</span>
                <div
                  class="toggle-btn"
                  :class="{ active: groupSettings.muted }"
                  @click="groupSettings.muted = !groupSettings.muted"
                ></div>
              </div>
            </div>
            
            <div class="setting-section">
              <h4 class="section-title">危险操作</h4>
              <button class="danger-btn" @click="handleLeaveGroup">退出群聊</button>
            </div>
          </template>
          
          <!-- 私聊设置 -->
          <template v-else>
            <div class="setting-section">
              <h4 class="section-title">聊天设置</h4>
              <div class="setting-item">
                <span class="setting-label">消息免打扰</span>
                <div
                  class="toggle-btn"
                  :class="{ active: privateSettings.muted }"
                  @click="togglePrivateMuted"
                ></div>
              </div>
              <div class="setting-item">
                <span class="setting-label">置顶聊天</span>
                <div
                  class="toggle-btn"
                  :class="{ active: privateSettings.pinned }"
                  @click="togglePrivatePinned"
                ></div>
              </div>
            </div>
            
            <div class="setting-section">
              <h4 class="section-title">操作</h4>
              <button class="danger-btn" @click="handleDeleteChat">删除聊天</button>
            </div>
          </template>
        </div>
        <div class="modal-footer" v-if="currentChat.type === 'group'">
          <button class="btn btn-secondary" @click="showSettings = false">取消</button>
          <button class="btn btn-primary" @click="handleSaveGroupSettings">保存</button>
        </div>
      </div>
    </div>
    
    <!-- 添加成员弹窗 -->
    <div v-if="showAddMember" class="modal-overlay" @click.self="showAddMember = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加成员</h3>
          <button class="close-btn" @click="showAddMember = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="search-box">
            <input
              v-model="searchKeyword"
              type="text"
              placeholder="搜索好友..."
              class="form-control"
              @input="handleSearch"
            />
          </div>
          <div class="friend-list">
            <div
              v-for="friend in filteredFriends"
              :key="friend.id"
              class="friend-item"
              @click="toggleFriend(friend)"
            >
              <AvatarComponent :src="friend.avatar" :name="friend.nickname || friend.username" size="md" />
              <div class="friend-info">
                <div class="friend-name">{{ friend.nickname || friend.username }}</div>
                <div class="friend-username">@{{ friend.username }}</div>
              </div>
              <div class="friend-checkbox" :class="{ checked: selectedFriends.includes(friend.id) }">
                ✓
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddMember = false">取消</button>
          <button class="btn btn-primary" @click="handleAddMembers" :disabled="selectedFriends.length === 0">
            添加 {{ selectedFriends.length }} 人
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, nextTick } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';
import { friendApi, groupApi } from '@/api';
import AvatarComponent from './AvatarComponent.vue';
import MessageItem from './MessageItem.vue';

const chatStore = useChatStore();
const userStore = useUserStore();
const toastStore = useToastStore();

const messageContent = ref('');
const sending = ref(false);
const quotedMessage = ref(null);
const showSettings = ref(false);
const showAddMember = ref(false);
const messageWindow = ref(null);
const fileInput = ref(null);

const searchKeyword = ref('');
const friends = ref([]);
const selectedFriends = ref([]);

const currentChat = computed(() => chatStore.currentChat);
const messages = computed(() => chatStore.messages);

const groupSettings = ref({
  name: '',
  announcement: '',
  muted: false
});

const privateSettings = ref({
  muted: false,
  pinned: false
});

const chatName = computed(() => {
  if (!currentChat.value) return '';
  return currentChat.value.info?.nickname ||
         currentChat.value.info?.username ||
         currentChat.value.info?.name ||
         '未知';
});

const chatMeta = computed(() => {
  if (!currentChat.value) return '';
  if (currentChat.value.type === 'group') {
    return `${currentChat.value.info?.membersCount || 0} 名成员`;
  }
  return currentChat.value.info?.online ? '在线' : '离线';
});

const filteredFriends = computed(() => {
  if (!searchKeyword.value) {
    return friends.value;
  }
  const keyword = searchKeyword.value.toLowerCase();
  return friends.value.filter(f => 
    (f.nickname && f.nickname.toLowerCase().includes(keyword)) ||
    (f.username && f.username.toLowerCase().includes(keyword))
  );
});

const canManageGroup = computed(() => {
  if (!currentChat.value || currentChat.value.type !== 'group') return false;
  
  const groupInfo = currentChat.value.info;
  if (!groupInfo) return false;
  
  const currentUserId = userStore.user?.id || JSON.parse(localStorage.getItem('userData') || '{}').id;
  
  // 检查是否是创建者
  if (groupInfo.creatorId === currentUserId) return true;
  
  // 检查是否是管理员
  const admins = groupInfo.admins;
  if (Array.isArray(admins) && admins.includes(currentUserId)) return true;
  if (typeof admins === 'string') {
    try {
      const adminList = JSON.parse(admins);
      if (adminList.includes(currentUserId)) return true;
    } catch (e) {
      // admins 可能是逗号分隔的字符串
      if (admins.includes(currentUserId)) return true;
    }
  }
  
  return false;
});

function shouldShowAvatar(index) {
  const current = messages.value[index];
  if (!current) return false;
  
  const currentUserId = userStore.user?.id || JSON.parse(localStorage.getItem('userData') || '{}').id;
  const isSelf = current.senderId === currentUserId;
  
  if (isSelf) return false;
  
  if (index === 0) return true;
  
  const prev = messages.value[index - 1];
  if (!prev) return true;
  
  return prev.senderId !== current.senderId;
}

async function handleSend() {
  const content = messageContent.value.trim();
  if (!content || sending.value) return;
  
  sending.value = true;
  try {
    const data = {
      content,
      type: 'text'
    };
    
    if (currentChat.value.type === 'private') {
      data.receiverId = currentChat.value.id;
    } else {
      data.groupId = currentChat.value.id;
    }
    
    if (quotedMessage.value) {
      data.quotedMessage = {
        id: quotedMessage.value.id,
        senderId: quotedMessage.value.senderId,
        content: quotedMessage.value.content,
        sender: quotedMessage.value.sender
      };
    }
    
    const res = await chatStore.sendMessage(data);
    if (res.ok) {
      messageContent.value = '';
      quotedMessage.value = null;
    } else {
      toastStore.error(res.msg || '发送失败');
    }
  } catch (e) {
    console.error(e);
  } finally {
    sending.value = false;
  }
}

function handleRecall(messageId) {
  chatStore.recallMessage(messageId);
}

function handleQuote(message) {
  quotedMessage.value = message;
}

function handleFileChange(e) {
  const file = e.target.files[0];
  if (!file) return;
  toastStore.info('文件上传功能开发中');
  e.target.value = '';
}

function startVoiceCall() {
  toastStore.info('语音通话功能开发中');
}

async function handleSearch() {
  // 已经有computed处理了
}

async function loadFriends() {
  const res = await friendApi.getList();
  if (res.ok) {
    friends.value = res.data || [];
  }
}

function toggleFriend(friend) {
  const index = selectedFriends.value.indexOf(friend.id);
  if (index > -1) {
    selectedFriends.value.splice(index, 1);
  } else {
    selectedFriends.value.push(friend.id);
  }
}

async function handleAddMembers() {
  try {
    const res = await groupApi.manage({
      groupId: currentChat.value.id,
      action: 'addMembers',
      memberIds: selectedFriends.value
    });
    
    if (res.ok) {
      toastStore.success('添加成功');
      showAddMember.value = false;
      selectedFriends.value = [];
    } else {
      toastStore.error(res.msg || '添加失败');
    }
  } catch (e) {
    toastStore.error('添加失败');
  }
}

async function handleSaveGroupSettings() {
  try {
    if (groupSettings.value.name.trim()) {
      const res = await groupApi.manage({
        groupId: currentChat.value.id,
        action: 'updateName',
        value: groupSettings.value.name.trim()
      });
      
      if (!res.ok) {
        toastStore.error(res.msg || '群名称更新失败');
        return;
      }
    }
    
    if (groupSettings.value.announcement !== undefined) {
      const res = await groupApi.manage({
        groupId: currentChat.value.id,
        action: 'updateAnnouncement',
        value: groupSettings.value.announcement
      });
      
      if (!res.ok) {
        toastStore.error(res.msg || '群公告更新失败');
        return;
      }
    }
    
    toastStore.success('保存成功');
    showSettings.value = false;
    
    if (currentChat.value.info) {
      if (groupSettings.value.name.trim()) {
        currentChat.value.info.name = groupSettings.value.name.trim();
      }
      if (groupSettings.value.announcement !== undefined) {
        currentChat.value.info.announcement = groupSettings.value.announcement;
      }
    }
  } catch (e) {
    toastStore.error('保存失败');
  }
}

function handleLeaveGroup() {
  if (confirm('确定要退出群聊吗？')) {
    toastStore.info('功能开发中');
  }
}

async function togglePrivateMuted() {
  try {
    const newValue = !privateSettings.value.muted;
    const res = await chatStore.updateChatSetting({
      chatId: currentChat.value.id,
      type: currentChat.value.type,
      setting: 'muted',
      value: newValue
    });
    
    if (res.ok) {
      privateSettings.value.muted = newValue;
      toastStore.success(newValue ? '已开启免打扰' : '已关闭免打扰');
    } else {
      toastStore.error(res.msg || '设置失败');
    }
  } catch (e) {
    toastStore.error('设置失败');
  }
}

async function togglePrivatePinned() {
  try {
    const newValue = !privateSettings.value.pinned;
    const res = await chatStore.updateChatSetting({
      chatId: currentChat.value.id,
      type: currentChat.value.type,
      setting: 'pinned',
      value: newValue
    });
    
    if (res.ok) {
      privateSettings.value.pinned = newValue;
      toastStore.success(newValue ? '已置顶聊天' : '已取消置顶');
    } else {
      toastStore.error(res.msg || '设置失败');
    }
  } catch (e) {
    toastStore.error('设置失败');
  }
}

function handleDeleteChat() {
  if (confirm('确定要删除聊天记录吗？')) {
    toastStore.info('功能开发中');
  }
}

watch(() => currentChat.value?.id, () => {
  quotedMessage.value = null;
  messageContent.value = '';
  
  // 初始化设置
  if (currentChat.value) {
    if (currentChat.value.type === 'group') {
      groupSettings.value = {
        name: currentChat.value.info?.name || '',
        announcement: currentChat.value.info?.announcement || '',
        muted: false
      };
    }
  }
  
  nextTick(() => {
    chatStore.scrollToBottom();
  });
});

watch(showAddMember, (val) => {
  if (val) {
    loadFriends();
    selectedFriends.value = [];
  }
});

onMounted(() => {
  chatStore.scrollToBottom();
});
</script>

<style lang="scss" scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  background: linear-gradient(180deg, rgba(255, 252, 247, 0.72), rgba(239, 231, 220, 0.66));
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
}

.chat-header {
  padding: 16px 24px;
  background: rgba(255, 252, 247, 0.72);
  border-bottom: 1px solid rgba(255, 252, 247, 0.72);
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-shrink: 0;
  box-shadow: 0 8px 24px rgba(62, 49, 40, 0.04);
  z-index: 1;
}

.chat-header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-title {
  margin: 0 0 2px;
  font-size: 16px;
  font-weight: 600;
}

.chat-meta {
  margin: 0;
  font-size: 12px;
  color: var(--text-muted);
}

.chat-header-actions {
  display: flex;
  gap: 4px;
}

.icon-btn-sm {
  width: 34px;
  height: 34px;
  border: none;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.55);
  font-size: 16px;
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  
  &:hover {
    background: var(--bg-hover);
    color: var(--primary-dark);
    transform: translateY(-1px);
  }
}

.message-window {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  scroll-behavior: smooth;
  background: radial-gradient(circle at 12% 8%, rgba(216, 185, 164, 0.18), transparent 24%), radial-gradient(circle at 88% 20%, rgba(125, 139, 111, 0.1), transparent 22%);
}

.empty-messages {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--text-muted);
  text-align: center;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
}

.quoted-bar {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  gap: 8px;
}

.quoted-content {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  
  .quoted-label {
    color: var(--primary);
    font-size: 12px;
    font-weight: 500;
    flex-shrink: 0;
  }
  
  .quoted-text {
    font-size: 13px;
    color: var(--text-secondary);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
}

.input-area {
  margin: 0 18px 18px;
  padding: 12px;
  background: rgba(255, 252, 247, 0.86);
  border: 1px solid rgba(255, 252, 247, 0.78);
  border-radius: 24px;
  display: flex;
  align-items: flex-end;
  gap: 8px;
  flex-shrink: 0;
  box-shadow: var(--shadow-lg);
}

.input-tools {
  display: flex;
  gap: 4px;
  padding-bottom: 8px;
}

.tool-btn {
  width: 38px;
  height: 38px;
  border: none;
  border-radius: 14px;
  background: transparent;
  cursor: pointer;
  font-size: 18px;
  transition: all var(--transition-base);
  
  &:hover {
    background: var(--bg-hover);
    transform: translateY(-1px);
  }
}

.message-input {
  flex: 1;
  border: 1px solid rgba(154, 106, 79, 0.22);
  border-radius: 18px;
  padding: 12px 16px;
  font-size: 14px;
  line-height: 1.5;
  font-family: inherit;
  background: rgba(250, 246, 239, 0.78);
  resize: none;
  outline: none;
  transition: all var(--transition-base);
  max-height: 120px;
  
  &:focus {
    border-color: rgba(154, 106, 79, 0.5);
    background: rgba(255, 252, 247, 0.98);
    box-shadow: 0 0 0 4px rgba(154, 106, 79, 0.12);
  }
}

.send-btn {
  padding: 11px 22px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: 18px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--transition-base);
  align-self: flex-end;
  box-shadow: var(--shadow-md);
  
  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: var(--shadow-lg);
  }
  
  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
    box-shadow: none;
  }
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

.settings-modal {
  width: 450px;
  max-height: 80vh;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-content {
  width: 400px;
  max-height: 80vh;
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
  overflow-y: auto;
  flex: 1;
}

.setting-section {
  margin-bottom: 24px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.section-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-secondary);
  margin: 0 0 16px;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
  
  &:not(:last-child) {
    border-bottom: 1px solid var(--border);
  }
}

.setting-label {
  font-size: 14px;
  color: var(--text-primary);
}

.setting-value {
  font-size: 14px;
  color: var(--text-muted);
}

.setting-input,
.setting-textarea {
  width: 200px;
  padding: 8px 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(154, 106, 79, 0.14);
  }
}

.setting-textarea {
  resize: vertical;
  min-height: 80px;
}

.setting-input.disabled,
.setting-textarea.disabled {
  background: var(--bg-secondary);
  cursor: not-allowed;
  opacity: 0.6;
}

.permission-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-left: 8px;
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

.btn-secondary {
  padding: 8px 16px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    background: #e5e7eb;
  }
}

.danger-btn {
  width: 100%;
  padding: 12px;
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fecaca;
  border-radius: var(--radius-md);
  cursor: pointer;
  font-weight: 500;
  transition: all var(--transition-base);
  
  &:hover {
    background: #fecaca;
  }
}

.search-box {
  margin-bottom: 16px;
}

.form-control {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  outline: none;
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(154, 106, 79, 0.14);
  }
}

.friend-list {
  max-height: 300px;
  overflow-y: auto;
}

.friend-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background var(--transition-base);
  
  &:hover {
    background: var(--bg-hover);
  }
}

.friend-info {
  flex: 1;
}

.friend-name {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
}

.friend-username {
  font-size: 12px;
  color: var(--text-muted);
}

.friend-checkbox {
  width: 24px;
  height: 24px;
  border: 2px solid var(--border);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: transparent;
  transition: all var(--transition-base);
  
  &.checked {
    background: var(--primary);
    border-color: var(--primary);
    color: white;
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
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
      box-shadow: none;
    }
  }
}
</style>
