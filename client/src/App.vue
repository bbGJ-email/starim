<template>
  <div id="app-container">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" />
      </transition>
    </router-view>
    
    <!-- 全局Toast消息 -->
    <ToastContainer />
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { useSocketStore } from '@/stores/socket';
import ToastContainer from '@/components/ToastContainer.vue';

const userStore = useUserStore();
const socketStore = useSocketStore();

onMounted(() => {
  userStore.restoreFromStorage();
  
  if (userStore.isLoggedIn) {
    socketStore.connect();
  }
});
</script>

<style lang="scss">
#app-container {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>