<template>
  <div class="modal-overlay" @click.self="handleClose">
    <div class="modal-content">
      <div class="modal-header">
        <h3>创建群聊</h3>
        <button class="close-btn" @click="handleClose">✕</button>
      </div>
      
      <div class="modal-body">
        <div class="form-group">
          <label>群名称</label>
          <input
            v-model="groupName"
            type="text"
            class="input"
            placeholder="请输入群名称"
            maxlength="50"
          />
        </div>
        
        <div class="form-group">
          <label>选择成员</label>
          <div class="member-search-box">
            <input
              v-model="searchKeyword"
              type="text"
              class="input"
              placeholder="搜索好友"
            />
          </div>
          
          <div class="member-list">
            <div
              v-for="friend in filteredFriends"
              :key="friend.id"
              class="member-item"
              :class="{ selected: isMemberSelected(friend.id) }"
              @click="toggleMember(friend)"
            >
              <AvatarComponent
                :src="friend.avatar"
                :name="friend.nickname || friend.username"
                size="sm"
              />
              <span class="member-name">{{ friend.nickname || friend.username }}</span>
              <span v-if="isMemberSelected(friend.id)" class="check-icon">✓</span>
            </div>
            
            <div v-if="filteredFriends.length === 0" class="empty-members">
              <p>{{ searchKeyword ? '没有找到匹配的好友' : '暂无好友' }}</p>
            </div>
          </div>
          
          <div class="selected-count">
            已选择 {{ selectedMembers.length }} 人
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button class="btn btn-secondary" @click="handleClose">取消</button>
        <button
          class="btn btn-primary"
          :disabled="!groupName.trim() || selectedMembers.length < 1"
          @click="handleCreate"
        >
          创建
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { friendApi, groupApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import AvatarComponent from './AvatarComponent.vue';

const emit = defineEmits(['close', 'created']);

const toastStore = useToastStore();

const groupName = ref('');
const searchKeyword = ref('');
const friends = ref([]);
const selectedMembers = ref([]);

const filteredFriends = computed(() => {
  if (!searchKeyword.value) return friends.value;
  const keyword = searchKeyword.value.toLowerCase();
  return friends.value.filter(friend =>
    (friend.nickname || friend.username).toLowerCase().includes(keyword)
  );
});

function isMemberSelected(id) {
  return selectedMembers.value.some(m => m.id === id);
}

function toggleMember(friend) {
  const index = selectedMembers.value.findIndex(m => m.id === friend.id);
  if (index > -1) {
    selectedMembers.value.splice(index, 1);
  } else {
    selectedMembers.value.push(friend);
  }
}

async function handleCreate() {
  if (!groupName.value.trim() || selectedMembers.value.length < 1) return;
  
  try {
    const res = await groupApi.create({
      name: groupName.value.trim(),
      memberIds: selectedMembers.value.map(m => m.id)
    });
    
    if (res.ok) {
      toastStore.success('群聊创建成功');
      emit('created');
    } else {
      toastStore.error(res.msg || '创建失败');
    }
  } catch (e) {
    toastStore.error('创建失败');
  }
}

function handleClose() {
  emit('close');
}

onMounted(async () => {
  const res = await friendApi.getList();
  if (res.ok) {
    friends.value = res.data;
  }
});
</script>

<style lang="scss" scoped>
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
  backdrop-filter: blur(4px);
}

.modal-content {
  width: 480px;
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
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--transition-base);
  
  &:hover {
    background: var(--bg-secondary);
  }
}

.modal-body {
  padding: 20px;
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: 20px;
  
  label {
    display: block;
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 8px;
  }
}

.member-search-box {
  margin-bottom: 12px;
}

.member-list {
  max-height: 240px;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 4px;
}

.member-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    background: var(--bg-hover);
  }
  
  &.selected {
    background: var(--primary-container);
  }
}

.member-name {
  flex: 1;
  font-size: 14px;
  color: var(--text-primary);
}

.check-icon {
  color: var(--primary);
  font-weight: 600;
}

.empty-members {
  text-align: center;
  padding: 30px;
  color: var(--text-muted);
  
  p {
    margin: 0;
    font-size: 14px;
  }
}

.selected-count {
  margin-top: 12px;
  font-size: 13px;
  color: var(--text-secondary);
  text-align: right;
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
  transition: all var(--transition-base);
  border: none;
  
  &.btn-secondary {
    background: var(--bg-secondary);
    color: var(--text-secondary);
    
    &:hover {
      background: var(--bg-hover);
    }
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
  }
}
</style>