<template>
  <AppLayout>
    <div class="moments-view">
      <div class="moments-header">
        <h2>动态</h2>
        <button class="publish-btn" @click="showPublish = true">发布动态</button>
      </div>
      
      <div class="moments-list">
        <div
          v-for="moment in moments"
          :key="moment.id"
          class="moment-card"
        >
          <div class="moment-header">
            <AvatarComponent
              :src="moment.user?.avatar"
              :name="moment.user?.nickname || moment.user?.username"
              size="md"
            />
            <div class="moment-user-info">
              <span class="moment-username">{{ moment.user?.nickname || moment.user?.username }}</span>
              <span class="moment-time">{{ getRelativeTime(moment.createdAt) }}</span>
            </div>
          </div>
          
          <div class="moment-content">
            <p>{{ moment.content }}</p>
          </div>
          
          <div v-if="moment.images && moment.images.length > 0" class="moment-images">
            <img
              v-for="(img, index) in moment.images.slice(0, 9)"
              :key="index"
              :src="img"
              class="moment-image"
              :class="{ 'single': moment.images.length === 1 }"
            />
          </div>
          
          <div class="moment-footer">
            <button class="action-btn" @click="toggleLike(moment)">
              <span class="action-icon">{{ moment.liked ? '❤️' : '🤍' }}</span>
              <span>{{ moment.likeCount }} 赞</span>
            </button>
            <button class="action-btn" @click="toggleComment(moment)">
              <span class="action-icon">💬</span>
              <span>{{ moment.commentCount }} 评论</span>
            </button>
          </div>
          
          <div v-if="moment.likedBy && moment.likedBy.length > 0" class="moment-likes">
            <div class="liked-avatars">
              <AvatarComponent
                v-for="user in moment.likedBy.slice(0, 5)"
                :key="user.id"
                :src="user.avatar"
                :name="user.nickname || user.username"
                size="xs"
                class="liked-avatar"
              />
            </div>
            <span class="liked-text">
              <span v-for="(user, index) in moment.likedBy.slice(0, 3)" :key="user.id">
                {{ user.nickname || user.username }}{{ index < Math.min(moment.likedBy.length, 3) - 1 ? '、' : '' }}
              </span>
              <span v-if="moment.likedBy.length > 3">等{{ moment.likedBy.length }}人</span>
              觉得很赞
            </span>
          </div>
          
          <div v-if="moment.showComments" class="moment-comments">
            <div
              v-for="comment in moment.comments"
              :key="comment.id"
              class="comment-item"
            >
              <span class="comment-user">{{ comment.user?.nickname || comment.user?.username }}</span>
              <span class="comment-content">{{ comment.content }}</span>
            </div>
            
            <div class="comment-input-box">
              <input
                v-model="moment.commentInput"
                type="text"
                class="input input-sm"
                placeholder="写下你的评论..."
                @keydown.enter.exact.prevent="sendComment(moment)"
              />
              <button class="btn btn-primary btn-sm" @click="sendComment(moment)">发送</button>
            </div>
          </div>
        </div>
        
        <div v-if="moments.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <p>暂无动态</p>
          <button class="btn btn-primary" @click="showPublish = true">发布第一条动态</button>
        </div>
      </div>
    </div>
    
    <!-- 发布动态弹窗 -->
    <div v-if="showPublish" class="modal-overlay" @click.self="showPublish = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h3>发布动态</h3>
          <button class="close-btn" @click="showPublish = false">✕</button>
        </div>
        <div class="modal-body">
          <textarea
            v-model="publishContent"
            class="publish-textarea"
            placeholder="分享你的心情..."
            rows="6"
          ></textarea>
          
          <div class="publish-actions">
            <button class="tool-btn" @click="selectImages">📷 添加图片</button>
            <span class="char-count">{{ publishContent.length }}/500</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showPublish = false">取消</button>
          <button
            class="btn btn-primary"
            :disabled="!publishContent.trim()"
            @click="handlePublish"
          >
            发布
          </button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { momentApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import { getRelativeTime } from '@/utils/datetime';
import AppLayout from '@/components/AppLayout.vue';
import AvatarComponent from '@/components/AvatarComponent.vue';

const toastStore = useToastStore();

const moments = ref([]);
const showPublish = ref(false);
const publishContent = ref('');

async function loadMoments() {
  const res = await momentApi.getList();
  if (res.ok) {
    moments.value = res.data.map(m => ({
      ...m,
      showComments: false,
      commentInput: ''
    }));
  }
}

function toggleLike(moment) {
  if (moment.liked) {
    moment.liked = false;
    moment.likeCount--;
  } else {
    momentApi.like(moment.id);
    moment.liked = true;
    moment.likeCount++;
  }
}

function toggleComment(moment) {
  moment.showComments = !moment.showComments;
  if (moment.showComments && !moment.comments) {
    loadComments(moment);
  }
}

async function loadComments(moment) {
  const res = await momentApi.getComments(moment.id);
  if (res.ok) {
    moment.comments = res.data;
  }
}

async function sendComment(moment) {
  if (!moment.commentInput.trim()) return;
  
  const res = await momentApi.comment(moment.id, moment.commentInput);
  if (res.ok) {
    moment.commentInput = '';
    moment.commentCount++;
    await loadComments(moment);
  } else {
    toastStore.error(res.msg || '评论失败');
  }
}

function selectImages() {
  toastStore.info('图片上传功能开发中');
}

async function handlePublish() {
  if (!publishContent.value.trim()) return;
  
  const res = await momentApi.publish(publishContent.value.trim());
  
  if (res.ok) {
    toastStore.success('发布成功');
    showPublish.value = false;
    publishContent.value = '';
    await loadMoments();
  } else {
    toastStore.error(res.msg || '发布失败');
  }
}

onMounted(async () => {
  await loadMoments();
});
</script>

<style lang="scss" scoped>
.moments-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.moments-header {
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

.publish-btn {
  padding: 8px 16px;
  background: var(--gradient-primary);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: var(--shadow-md);
  }
}

.moments-list {
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.moment-card {
  background: rgba(255, 255, 255, 0.9);
  border-radius: var(--radius-lg);
  padding: 16px;
  box-shadow: var(--shadow-sm);
}

.moment-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.moment-user-info {
  display: flex;
  flex-direction: column;
  
  .moment-username {
    font-weight: 600;
    color: var(--text-primary);
  }
  
  .moment-time {
    font-size: 12px;
    color: var(--text-muted);
  }
}

.moment-content {
  margin-bottom: 12px;
  
  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.6;
    color: var(--text-primary);
  }
}

.moment-images {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-bottom: 12px;
}

.moment-image {
  width: 100%;
  aspect-ratio: 1;
  object-fit: cover;
  border-radius: var(--radius-sm);
  
  &.single {
    grid-column: span 1;
    max-width: 200px;
  }
}

.moment-footer {
  display: flex;
  gap: 24px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    color: var(--primary);
  }
  
  .action-icon {
    font-size: 16px;
  }
}

.moment-likes {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px;
  background: var(--bg-secondary);
  border-radius: var(--radius-md);
  margin-top: 12px;
}

.liked-avatars {
  display: flex;
}

.liked-avatar {
  margin-left: -8px;
  border: 2px solid white;
  
  &:first-child {
    margin-left: 0;
  }
}

.liked-text {
  font-size: 12px;
  color: var(--text-secondary);
}

.moment-comments {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border);
}

.comment-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--border);
  
  &:last-child {
    border-bottom: none;
  }
}

.comment-user {
  font-weight: 500;
  color: var(--primary);
  margin-right: 8px;
}

.comment-content {
  color: var(--text-primary);
  font-size: 14px;
}

.comment-input-box {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  
  .input-sm {
    flex: 1;
    padding: 8px 12px;
    font-size: 13px;
  }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
  
  .empty-icon {
    font-size: 64px;
    margin-bottom: 16px;
  }
  
  p {
    margin: 0 0 20px;
    color: var(--text-muted);
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

.modal-content {
  width: 480px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  
  &.modal-large {
    width: 560px;
  }
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

.publish-textarea {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-size: 14px;
  font-family: inherit;
  resize: none;
  outline: none;
  transition: all var(--transition-base);
  
  &:focus {
    border-color: var(--primary);
    box-shadow: 0 0 0 3px rgba(154, 106, 79, 0.14);
  }
}

.publish-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
}

.tool-btn {
  background: transparent;
  border: none;
  font-size: 14px;
  color: var(--primary);
  cursor: pointer;
}

.char-count {
  font-size: 13px;
  color: var(--text-muted);
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
    
    &:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    &.btn-sm {
      padding: 6px 12px;
      font-size: 13px;
    }
  }
}
</style>