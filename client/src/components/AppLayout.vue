<template>
  <div class="app-layout">
    <!-- 左侧导航栏 -->
    <aside class="sidebar">
      <div class="sidebar-top">
        <div class="user-avatar-wrapper" @click="$router.push('/profile')">
          <AvatarComponent
            :src="userStore.user?.avatar"
            :name="userStore.user?.nickname || userStore.user?.username"
            size="md"
          />
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <router-link
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          class="nav-item"
          :class="{ active: $route.path === item.path }"
        >
          <span class="nav-icon">{{ item.icon }}</span>
          <span class="nav-label">{{ item.label }}</span>
        </router-link>
      </nav>
      
      <div class="sidebar-bottom">
        <div class="nav-item" @click="handleLogout">
          <span class="nav-icon">⏻</span>
          <span class="nav-label">退出</span>
        </div>
      </div>
    </aside>
    
    <!-- 主内容区 -->
    <main class="main-content">
      <slot />
    </main>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useToastStore } from '@/stores/toast';
import AvatarComponent from './AvatarComponent.vue';

const router = useRouter();
const userStore = useUserStore();
const toastStore = useToastStore();

const navItems = computed(() => {
  const items = [
    { path: '/chat', icon: '💬', label: '聊天' },
    { path: '/contacts', icon: '👥', label: '联系人' },
    { path: '/moments', icon: '🌐', label: '朋友圈' },
    { path: '/feedback', icon: '📝', label: '反馈' },
    { path: '/profile', icon: '👤', label: '个人' }
  ];
  
  if (userStore.isAdmin) {
    items.push({ path: '/admin', icon: '⚙️', label: '管理' });
  }
  
  return items;
});

function handleLogout() {
  userStore.logout();
  toastStore.success('已退出登录');
}
</script>

<style lang="scss" scoped>
.app-layout {
  display: flex;
  width: 100%;
  height: 100vh;
  padding: 16px;
  gap: 16px;
  background: var(--gradient-bg);
}

.sidebar {
  width: 86px;
  background: rgba(255, 252, 247, 0.72);
  backdrop-filter: blur(28px);
  -webkit-backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 252, 247, 0.72);
  border-radius: 28px;
  box-shadow: var(--shadow-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 18px 0;
  gap: 18px;
  flex-shrink: 0;
}

.sidebar-top {
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-light);
  width: 100%;
  display: flex;
  justify-content: center;
}

.user-avatar-wrapper {
  cursor: pointer;
  transition: transform var(--transition-base);
  
  &:hover {
    transform: scale(1.05);
  }
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  align-items: center;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 11px 8px;
  width: 64px;
  border-radius: 20px;
  cursor: pointer;
  text-decoration: none;
  color: var(--text-secondary);
  transition: all var(--transition-base);
  position: relative;
  
  &:hover {
    background: rgba(255, 252, 247, 0.7);
    color: var(--primary);
    transform: translateY(-2px);
    box-shadow: var(--shadow-sm);
  }
  
  &.active {
    background: var(--gradient-primary);
    color: white;
    box-shadow: var(--shadow-md);
  }
  
  .nav-icon {
    font-size: 22px;
  }
  
  .nav-label {
    font-size: 11px;
    font-weight: 500;
  }
}

.sidebar-bottom {
  padding-top: 16px;
  border-top: 1px solid var(--border-light);
  width: 100%;
  display: flex;
  justify-content: center;
}

.main-content {
  flex: 1;
  overflow: hidden;
  position: relative;
  min-width: 0;
  border-radius: 28px;
  box-shadow: var(--shadow-xl);
}
</style>
