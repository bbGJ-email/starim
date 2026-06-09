<template>
  <AppLayout>
    <div class="chat-view">
      <!-- 聊天列表 -->
      <aside class="chat-list-panel">
        <div class="panel-header">
          <h2 class="panel-title">聊天</h2>
          <button class="icon-btn" @click="showCreateGroup = true" title="创建群聊">+</button>
        </div>
        
        <div class="search-box">
          <input
            v-model="searchKeyword"
            type="text"
            class="input"
            placeholder="搜索"
          />
        </div>
        
        <div class="chat-list">
          <div
            v-for="chat in filteredChatList"
            :key="`${chat.type}-${chat.id}`"
            class="chat-item"
            :class="{ active: isCurrentChat(chat) }"
            @click="selectChat(chat)"
          >
            <AvatarComponent
              :src="chat.avatar"
              :name="chat.name"
              size="md"
            />
            <div class="chat-info">
              <div class="chat-name-row">
                <span class="chat-name">{{ chat.name }}</span>
                <span v-if="chat.lastMessageTime" class="chat-time">
                  {{ formatTime(chat.lastMessageTime) }}
                </span>
              </div>
              <div class="chat-preview-row">
                <span class="chat-preview">{{ chat.lastMessage }}</span>
                <span v-if="chat.unreadCount > 0" class="badge">
                  {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
                </span>
              </div>
            </div>
          </div>
          
          <div v-if="filteredChatList.length === 0" class="empty-state">
            <div class="empty-icon">💬</div>
            <p>{{ searchKeyword ? '没有找到匹配的聊天' : '暂无聊天' }}</p>
          </div>
        </div>
      </aside>
      
      <!-- 聊天区域 -->
      <section class="chat-main">
        <ChatPanel v-if="chatStore.currentChat" />
        <div v-else class="welcome">
          <div class="welcome-icon">💬</div>
          <h2>欢迎使用星智IM</h2>
          <p>选择一个聊天开始对话</p>
        </div>
      </section>
    </div>
    
    <!-- 创建群组弹窗 -->
    <CreateGroupModal
      v-if="showCreateGroup"
      @close="showCreateGroup = false"
      @created="onGroupCreated"
    />
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/stores/chat';
import { useUserStore } from '@/stores/user';
import AppLayout from '@/components/AppLayout.vue';
import AvatarComponent from '@/components/AvatarComponent.vue';
import ChatPanel from '@/components/ChatPanel.vue';
import CreateGroupModal from '@/components/CreateGroupModal.vue';
import { formatTime } from '@/utils/datetime';

const chatStore = useChatStore();
const userStore = useUserStore();

const searchKeyword = ref('');
const showCreateGroup = ref(false);

const filteredChatList = computed(() => {
  if (!searchKeyword.value) return chatStore.chatList;
  const keyword = searchKeyword.value.toLowerCase();
  return chatStore.chatList.filter(chat =>
    chat.name.toLowerCase().includes(keyword)
  );
});

function isCurrentChat(chat) {
  return chatStore.currentChat?.id === chat.id && chatStore.currentChat?.type === chat.type;
}

function selectChat(chat) {
  chatStore.openChat(chat.id, chat.type);
}

function onGroupCreated() {
  chatStore.loadGroups();
  showCreateGroup.value = false;
}

function handleOpenChat(event) {
  const { id, type } = event.detail;
  chatStore.openChat(id, type);
}

onMounted(async () => {
  await chatStore.loadChatData();
  window.addEventListener('openChat', handleOpenChat);
});

onUnmounted(() => {
  window.removeEventListener('openChat', handleOpenChat);
});
</script>

<style lang="scss" scoped>
.chat-view {
  display: flex;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: rgba(255, 252, 247, 0.55);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 252, 247, 0.72);
}

.chat-list-panel {
  width: 340px;
  background: rgba(255, 252, 247, 0.72);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-right: 1px solid rgba(255, 252, 247, 0.7);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.panel-header {
  padding: 24px 20px 14px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.panel-title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--text-primary);
}

.icon-btn {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: var(--radius-full);
  background: var(--gradient-primary);
  color: white;
  font-size: 22px;
  font-weight: 300;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  box-shadow: var(--shadow-md);
  
  &:hover {
    transform: rotate(90deg) scale(1.05);
    box-shadow: var(--shadow-lg);
  }
}

.search-box {
  padding: 0 20px 14px;
}

.chat-list {
  flex: 1;
  overflow-y: auto;
  padding: 2px 12px 18px;
}

.chat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 18px;
  cursor: pointer;
  transition: all var(--transition-base);
  margin-bottom: 6px;
  border: 1px solid transparent;
  
  &:hover {
    background: rgba(255, 252, 247, 0.78);
    border-color: rgba(255, 252, 247, 0.9);
    transform: translateX(3px);
    box-shadow: var(--shadow-sm);
  }
  
  &.active {
    background: rgba(255, 252, 247, 0.95);
    border-color: rgba(154, 106, 79, 0.18);
    box-shadow: var(--shadow-md);
  }
}

.chat-info {
  flex: 1;
  min-width: 0;
}

.chat-name-row,
.chat-preview-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.chat-name {
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chat-time {
  font-size: 11px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
}

.chat-preview {
  font-size: 13px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.badge {
  background: var(--danger);
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: var(--radius-full);
  min-width: 18px;
  text-align: center;
  flex-shrink: 0;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-muted);
  
  .empty-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.chat-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  text-align: center;
  color: var(--text-muted);
  
  .welcome-icon {
    font-size: 96px;
    margin-bottom: 24px;
    filter: drop-shadow(0 4px 12px rgba(98, 74, 55, 0.18));
  }
  
  h2 {
    margin: 0 0 8px;
    font-size: 24px;
    color: var(--text-primary);
  }
  
  p {
    margin: 0;
    font-size: 14px;
  }
}
</style>
