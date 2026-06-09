<template>
  <AppLayout>
    <div class="contacts-view">
      <div class="contacts-header">
        <h2>联系人</h2>
        <button class="add-btn" @click="showAddFriend = true">+ 添加好友</button>
      </div>
      
      <div class="tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'friends' }"
          @click="activeTab = 'friends'"
        >
          好友 ({{ friends.length }})
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'requests' }"
          @click="activeTab = 'requests'"
        >
          好友请求
          <span v-if="friendRequests.length > 0" class="badge">{{ friendRequests.length }}</span>
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'groups' }"
          @click="activeTab = 'groups'"
        >
          群组 ({{ groups.length }})
        </button>
      </div>
      
      <!-- 好友列表 -->
      <div v-if="activeTab === 'friends'" class="contacts-list">
        <div class="search-box">
          <input
            v-model="searchKeyword"
            type="text"
            class="input"
            placeholder="搜索好友"
          />
        </div>
        
        <div
          v-for="friend in filteredFriends"
          :key="friend.id"
          class="contact-item"
          @click="openChat(friend)"
        >
          <AvatarComponent
            :src="friend.avatar"
            :name="friend.nickname || friend.username"
            size="md"
          />
          <div class="contact-info">
            <span class="contact-name">{{ friend.nickname || friend.username }}</span>
            <span class="contact-status" :class="{ online: friend.online }">
              {{ friend.online ? '在线' : '离线' }}
            </span>
          </div>
        </div>
        
        <div v-if="filteredFriends.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <p>{{ searchKeyword ? '没有找到匹配的好友' : '暂无好友' }}</p>
        </div>
      </div>
      
      <!-- 好友请求列表 -->
      <div v-if="activeTab === 'requests'" class="contacts-list">
        <div v-if="friendRequests.length > 0">
          <div
            v-for="request in friendRequests"
            :key="request.id"
            class="request-item"
          >
            <div class="request-user">
              <AvatarComponent
                :src="request.fromUser?.avatar"
                :name="request.fromUser?.nickname || request.fromUser?.username"
                size="md"
              />
              <div class="request-info">
                <span class="request-name">{{ request.fromUser?.nickname || request.fromUser?.username }}</span>
                <span class="request-message">{{ request.message || '请求添加你为好友' }}</span>
              </div>
            </div>
            <div class="request-actions">
              <button class="btn btn-primary btn-sm" @click="acceptRequest(request.id)">接受</button>
              <button class="btn btn-secondary btn-sm" @click="rejectRequest(request.id)">拒绝</button>
            </div>
          </div>
        </div>
        
        <div v-else class="empty-state">
          <div class="empty-icon">📬</div>
          <p>暂无好友请求</p>
        </div>
      </div>
      
      <!-- 群组列表 -->
      <div v-if="activeTab === 'groups'" class="contacts-list">
        <div class="search-box">
          <input
            v-model="searchKeyword"
            type="text"
            class="input"
            placeholder="搜索群组"
          />
        </div>
        
        <div
          v-for="group in filteredGroups"
          :key="group.id"
          class="contact-item"
          @click="openGroupChat(group)"
        >
          <AvatarComponent
            :src="group.avatar"
            :name="group.name"
            size="md"
          />
          <div class="contact-info">
            <span class="contact-name">{{ group.name }}</span>
            <span class="contact-meta">{{ group.membersCount || 0 }} 名成员</span>
          </div>
        </div>
        
        <div v-if="filteredGroups.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <p>{{ searchKeyword ? '没有找到匹配的群组' : '暂无群组' }}</p>
        </div>
      </div>
    </div>
    
    <!-- 添加好友弹窗 -->
    <div v-if="showAddFriend" class="modal-overlay" @click.self="showAddFriend = false">
      <div class="modal-content">
        <div class="modal-header">
          <h3>添加好友</h3>
          <button class="close-btn" @click="showAddFriend = false">✕</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>搜索用户</label>
            <input
              v-model="searchUserKeyword"
              type="text"
              class="input"
              placeholder="输入用户名或ID"
            />
          </div>
          
          <div v-if="searchUserKeyword" class="search-results">
            <div
              v-for="user in searchResults"
              :key="user.id"
              class="search-item"
            >
              <AvatarComponent
                :src="user.avatar"
                :name="user.nickname || user.username"
                size="sm"
              />
              <div class="search-info">
                <span class="search-name">{{ user.nickname || user.username }}</span>
                <span class="search-id">ID: {{ user.id }}</span>
              </div>
              <button
                class="btn btn-primary btn-sm"
                @click="sendFriendRequest(user.id)"
              >
                添加
              </button>
            </div>
            
            <div v-if="searchResults.length === 0" class="no-results">
              <p>没有找到用户</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" @click="showAddFriend = false">取消</button>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { friendApi, groupApi, userApi } from '@/api';
import { useToastStore } from '@/stores/toast';
import AppLayout from '@/components/AppLayout.vue';
import AvatarComponent from '@/components/AvatarComponent.vue';

const router = useRouter();
const toastStore = useToastStore();

const activeTab = ref('friends');
const searchKeyword = ref('');
const searchUserKeyword = ref('');
const showAddFriend = ref(false);
const friends = ref([]);
const groups = ref([]);
const friendRequests = ref([]);
const searchResults = ref([]);

const filteredFriends = computed(() => {
  if (!searchKeyword.value) return friends.value;
  const keyword = searchKeyword.value.toLowerCase();
  return friends.value.filter(f =>
    (f.nickname || f.username).toLowerCase().includes(keyword)
  );
});

const filteredGroups = computed(() => {
  if (!searchKeyword.value) return groups.value;
  const keyword = searchKeyword.value.toLowerCase();
  return groups.value.filter(g => g.name.toLowerCase().includes(keyword));
});

async function loadFriends() {
  const res = await friendApi.getList();
  if (res.ok) {
    friends.value = res.data;
  }
}

async function loadGroups() {
  const res = await groupApi.getList();
  if (res.ok) {
    groups.value = res.data;
  }
}

async function loadFriendRequests() {
  const res = await friendApi.getRequests();
  if (res.ok) {
    friendRequests.value = res.data;
  }
}

async function acceptRequest(requestId) {
  const res = await friendApi.accept(requestId);
  if (res.ok) {
    toastStore.success('已接受好友请求');
    await Promise.all([loadFriendRequests(), loadFriends()]);
  } else {
    toastStore.error(res.msg || '操作失败');
  }
}

async function rejectRequest(requestId) {
  const res = await friendApi.reject(requestId);
  if (res.ok) {
    toastStore.success('已拒绝好友请求');
    await loadFriendRequests();
  } else {
    toastStore.error(res.msg || '操作失败');
  }
}

function openChat(friend) {
  router.push('/chat');
  setTimeout(() => {
    const event = new CustomEvent('openChat', {
      detail: { id: friend.id, type: 'private' }
    });
    window.dispatchEvent(event);
  }, 100);
}

function openGroupChat(group) {
  router.push('/chat');
  setTimeout(() => {
    const event = new CustomEvent('openChat', {
      detail: { id: group.id, type: 'group' }
    });
    window.dispatchEvent(event);
  }, 100);
}

watch(searchUserKeyword, async (val) => {
  if (val.trim()) {
    const res = await userApi.search(val.trim());
    if (res.ok) {
      searchResults.value = res.list || res.data || [];
    }
  } else {
    searchResults.value = [];
  }
});

async function sendFriendRequest(userId) {
  const res = await friendApi.add(userId);
  if (res.ok) {
    toastStore.success('好友请求已发送');
    showAddFriend.value = false;
    searchUserKeyword.value = '';
  } else {
    toastStore.error(res.msg || '发送失败');
  }
}

onMounted(async () => {
  await Promise.all([loadFriends(), loadGroups(), loadFriendRequests()]);
});
</script>

<style lang="scss" scoped>
.contacts-view {
  padding: 20px;
  height: 100%;
  overflow-y: auto;
}

.contacts-header {
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

.add-btn {
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

.tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border);
}

.tab-btn {
  padding: 8px 20px;
  background: transparent;
  border: none;
  border-radius: var(--radius-md);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--transition-base);
  color: var(--text-secondary);
  position: relative;
  
  &:hover {
    background: var(--bg-hover);
    color: var(--text-primary);
  }
  
  &.active {
    background: var(--primary-container);
    color: var(--primary-dark);
  }
  
  .badge {
    position: absolute;
    top: 4px;
    right: 4px;
    background: var(--danger);
    color: white;
    font-size: 11px;
    padding: 2px 6px;
    border-radius: var(--radius-full);
    min-width: 18px;
    text-align: center;
  }
}

.contacts-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.search-box {
  margin-bottom: 16px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all var(--transition-base);
  
  &:hover {
    background: white;
    box-shadow: var(--shadow-sm);
  }
}

.contact-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contact-name {
  font-weight: 500;
  color: var(--text-primary);
}

.contact-status {
  font-size: 12px;
  color: var(--text-muted);
  
  &.online {
    color: var(--success);
  }
}

.contact-meta {
  font-size: 12px;
  color: var(--text-muted);
}

.request-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: var(--radius-md);
  gap: 16px;
}

.request-user {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.request-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.request-name {
  font-weight: 500;
  color: var(--text-primary);
}

.request-message {
  font-size: 13px;
  color: var(--text-muted);
}

.request-actions {
  display: flex;
  gap: 8px;
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
}

.search-results {
  max-height: 240px;
  overflow-y: auto;
}

.search-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px;
  border-radius: var(--radius-md);
  
  &:hover {
    background: var(--bg-hover);
  }
}

.search-info {
  flex: 1;
  
  .search-name {
    display: block;
    font-weight: 500;
    font-size: 14px;
  }
  
  .search-id {
    display: block;
    font-size: 12px;
    color: var(--text-muted);
  }
}

.no-results {
  text-align: center;
  padding: 30px;
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
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: var(--shadow-md);
    }
    
    &.btn-sm {
      padding: 6px 12px;
      font-size: 13px;
    }
  }
  
  &.btn-sm {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>