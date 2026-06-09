<template>
  <div
    class="message-item"
    :class="{
      'message-self': isSelf,
      'message-system': message.type === 'system'
    }"
    @contextmenu.prevent="showContextMenu"
  >
    <AvatarComponent
      v-if="showAvatar"
      :src="message.sender?.avatar"
      :name="message.sender?.nickname || message.sender?.username || '未知用户'"
      size="sm"
      class="message-avatar"
    />

    <div class="message-content-wrapper">
      <div v-if="message.type === 'system'" class="system-message">
        {{ message.content }}
      </div>

      <div v-else class="message-bubble">
        <div v-if="!isSelf" class="sender-name">
          {{ message.sender?.nickname || message.sender?.username || '未知用户' }}
        </div>

        <!-- 引用消息 -->
        <div v-if="message.quotedMessage" class="quoted-message">
          <div class="quoted-line"></div>
          <div class="quoted-info">
            <span class="quoted-sender">
              {{ getQuotedSenderName(message.quotedMessage) }}:
            </span>
            <span class="quoted-content">
              {{ message.quotedMessage.content }}
            </span>
          </div>
        </div>

        <!-- 消息内容 -->
        <div class="message-text" :class="{ 'recalled': message.isRecalled }">
          {{ message.isRecalled ? '消息已撤回' : message.content }}
        </div>

        <!-- 消息时间 -->
        <div class="message-time">
          {{ formatMessageTime(message.timestamp) }}
          <span v-if="message.isRecalled" class="recalled-tag">已撤回</span>
        </div>
      </div>
    </div>

    <!-- 右键菜单 -->
    <div
      v-if="contextMenuVisible"
      class="context-menu"
      :style="contextMenuStyle"
      @click.self="contextMenuVisible = false"
    >
      <button v-if="!message.isRecalled" class="context-item" @click="handleReply">
        ↩ 回复
      </button>
      <button
        v-if="isSelf && !message.isRecalled"
        class="context-item danger"
        @click="handleRecall"
      >
        🗑️ 撤回
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, reactive } from 'vue';
import { useUserStore } from '@/stores/user';
import AvatarComponent from './AvatarComponent.vue';

const props = defineProps({
  message: {
    type: Object,
    required: true
  },
  showAvatar: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['recall', 'quote']);

const contextMenuVisible = ref(false);
const contextMenuPosition = reactive({ x: 0, y: 0 });

const contextMenuStyle = computed(() => ({
  left: `${contextMenuPosition.x}px`,
  top: `${contextMenuPosition.y}px`
}));

const userStore = useUserStore();

const isSelf = computed(() => {
  const currentUserId = userStore.user?.id || JSON.parse(localStorage.getItem('userData') || '{}').id;
  return props.message.senderId === currentUserId;
});

function showContextMenu(event) {
  contextMenuPosition.x = event.clientX;
  contextMenuPosition.y = event.clientY;
  contextMenuVisible.value = true;
  
  document.addEventListener('click', hideContextMenu);
}

function hideContextMenu() {
  contextMenuVisible.value = false;
  document.removeEventListener('click', hideContextMenu);
}

function handleReply() {
  emit('quote', props.message);
  hideContextMenu();
}

function handleRecall() {
  emit('recall', props.message.id);
  hideContextMenu();
}

function getQuotedSenderName(quotedMsg) {
  if (!quotedMsg.sender) return '未知用户';
  return quotedMsg.sender.nickname || quotedMsg.sender.username || '未知用户';
}

function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  if (isYesterday) {
    return `昨天 ${date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }

  return date.toLocaleDateString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
}
</script>

<style lang="scss" scoped>
.message-item {
  display: flex;
  gap: 10px;
  margin-bottom: 8px;
  padding: 4px 12px;

  &.message-self {
    flex-direction: row-reverse;

    .message-content-wrapper {
      align-items: flex-end;
    }

    .message-bubble {
      background: var(--gradient-primary);
      color: white;
      border-color: transparent;
      border-radius: 20px 8px 20px 20px;
      box-shadow: var(--shadow-md);

      .sender-name {
        text-align: right;
        color: rgba(255, 255, 255, 0.8);
      }

      .quoted-message {
        background: rgba(255, 255, 255, 0.2);
        border-left: 3px solid rgba(255, 255, 255, 0.5);

        .quoted-sender {
          color: rgba(255, 255, 255, 0.9);
        }

        .quoted-content {
          color: rgba(255, 255, 255, 0.85);
        }
      }

      .message-time {
        color: rgba(255, 255, 255, 0.7);

        .recalled-tag {
          color: rgba(255, 255, 255, 0.6);
        }
      }
    }
  }

  &.message-system {
    justify-content: center;
    padding: 8px 16px;

    .system-message {
      font-size: 12px;
      color: var(--text-muted);
      background: var(--bg-secondary);
      padding: 4px 12px;
      border-radius: 12px;
    }
  }
}

.message-avatar {
  flex-shrink: 0;
  align-self: flex-start;
  margin-top: 4px;
}

.message-content-wrapper {
  display: flex;
  flex-direction: column;
  max-width: 70%;
  min-width: 80px;
}

.message-bubble {
  background: rgba(255, 252, 247, 0.92);
  border: 1px solid rgba(255, 252, 247, 0.78);
  border-radius: 8px 20px 20px 20px;
  padding: 10px 14px;
  box-shadow: var(--shadow-sm);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  .sender-name {
    font-size: 12px;
    color: var(--text-secondary);
    margin-bottom: 4px;
    font-weight: 500;
  }

  .quoted-message {
    background: var(--bg-secondary);
    border-left: 3px solid var(--primary);
    padding: 8px 10px;
    border-radius: 4px;
    margin-bottom: 8px;
    display: flex;
    gap: 8px;

    .quoted-info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .quoted-sender {
      font-size: 12px;
      font-weight: 500;
      color: var(--primary);
      flex-shrink: 0;
    }

    .quoted-content {
      font-size: 13px;
      color: var(--text-secondary);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .message-text {
    font-size: 14px;
    line-height: 1.6;
    word-wrap: break-word;
    white-space: pre-wrap;
    margin-bottom: 5px;
  }

  .message-time {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    font-size: 11px;
    color: var(--text-muted);

    .recalled-tag {
      font-size: 11px;
    }
  }
}

.message-text.recalled {
  color: var(--text-muted);
  font-style: italic;
}

.context-menu {
  position: fixed;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 4px;
  z-index: 1000;
  min-width: 120px;

  .context-item {
    display: block;
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: transparent;
    border-radius: var(--radius-sm);
    font-size: 13px;
    cursor: pointer;
    text-align: left;
    transition: all var(--transition-base);

    &:hover {
      background: var(--bg-hover);
    }

    &.danger {
      color: var(--danger);

      &:hover {
        background: rgba(239, 68, 68, 0.1);
      }
    }
  }
}
</style>