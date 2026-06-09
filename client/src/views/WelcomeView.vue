<template>
  <div class="welcome-container">
    <div class="welcome-content">
      <div class="logo-wrapper">
        <div class="logo">
          <img class="logo-icon" src="https://s41.ax1x.com/2026/01/19/pZ6lpFI.png" alt="星智IM" />
        </div>
        <div class="logo-pulse"></div>
      </div>
      
      <h1 class="title">星智IM</h1>
      
      <div class="subtitle">全新升级，焕新上线</div>
      
      <div class="version-badge">vue-1.0.0</div>
      
      <div class="progress-container">
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: progress + '%' }"></div>
        </div>
        <span class="progress-text">{{ progress }}%</span>
      </div>
      
      <div class="loading-text">{{ loadingText }}</div>
    </div>
    
    <div class="particles">
      <div v-for="n in 20" :key="n" class="particle" :style="getParticleStyle(n)"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from '@/stores/user';
import { useSocketStore } from '@/stores/socket';

const router = useRouter();
const userStore = useUserStore();
const socketStore = useSocketStore();
const progress = ref(0);
const loadingText = ref('正在加载...');

const loadingTexts = [
  '正在加载...',
  '初始化连接...',
  '加载用户数据...',
  '准备就绪...'
];

function getParticleStyle(index) {
  const left = Math.random() * 100;
  const delay = Math.random() * 3;
  const duration = 3 + Math.random() * 4;
  const size = 4 + Math.random() * 8;
  
  return {
    left: `${left}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`,
    width: `${size}px`,
    height: `${size}px`
  };
}

async function startLoading() {
  let currentTextIndex = 0;
  
  for (let i = 0; i <= 100; i += 2) {
    progress.value = i;
    
    if (i >= 25 && currentTextIndex < loadingTexts.length) {
      loadingText.value = loadingTexts[currentTextIndex];
      currentTextIndex++;
    }
    
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  
  await new Promise(resolve => setTimeout(resolve, 500));
  
  userStore.restoreFromStorage();
  
  if (userStore.isLoggedIn) {
    socketStore.connect();
    router.push('/chat');
  } else {
    router.push('/login');
  }
}

onMounted(() => {
  startLoading();
});
</script>

<style lang="scss" scoped>
.welcome-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  background: linear-gradient(135deg, #2c241d 0%, #3a3027 50%, #2c241d 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  z-index: 9999;
}

.particles {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  bottom: -20px;
  background: radial-gradient(circle, rgba(216, 185, 164, 0.45) 0%, rgba(216, 185, 164, 0.12) 100%);
  border-radius: 50%;
  animation: floatUp linear infinite;
}

@keyframes floatUp {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  90% {
    opacity: 1;
  }
  100% {
    transform: translateY(-100vh) scale(0.5);
    opacity: 0;
  }
}

.welcome-content {
  text-align: center;
  z-index: 10;
}

.logo-wrapper {
  position: relative;
  margin-bottom: 30px;
}

.logo {
  width: 100px;
  height: 100px;
  margin: 0 auto;
  background: var(--gradient-primary);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16px 40px rgba(98, 74, 55, 0.18);
  animation: logoScale 2s ease-in-out infinite;
}

.logo-icon {
  width: 60px;
  height: 60px;
  object-fit: contain;
  animation: iconBounce 1s ease-in-out infinite;
}

@keyframes logoScale {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 16px 40px rgba(98, 74, 55, 0.18);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 18px 48px rgba(98, 74, 55, 0.22);
  }
}

@keyframes iconBounce {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-5px);
  }
}

.logo-pulse {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 100px;
  height: 100px;
  background: rgba(216, 185, 164, 0.24);
  border-radius: 50%;
  animation: pulse 2s ease-out infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(1);
    opacity: 0.8;
  }
  100% {
    transform: translate(-50%, -50%) scale(2.5);
    opacity: 0;
  }
}

.title {
  font-size: 48px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 10px 0;
  background: linear-gradient(90deg, #9a6a4f, #fff8ef, #7d8b6f);
  background-size: 200% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  animation: shimmer 3s linear infinite;
}

@keyframes shimmer {
  0% {
    background-position: -200% center;
  }
  100% {
    background-position: 200% center;
  }
}

.subtitle {
  font-size: 20px;
  color: rgba(255, 255, 255, 0.7);
  margin-bottom: 20px;
  animation: fadeInUp 0.8s ease-out;
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.version-badge {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(216, 185, 164, 0.16);
  border: 1px solid rgba(154, 106, 79, 0.28);
  border-radius: 20px;
  color: #d8b9a4;
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 40px;
  animation: fadeIn 0.5s ease-out 0.3s both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

.progress-container {
  width: 280px;
  margin: 0 auto 20px;
}

.progress-bar {
  height: 4px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #9a6a4f, #7d8b6f);
  border-radius: 2px;
  transition: width 0.1s ease;
}

.progress-text {
  display: block;
  text-align: right;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  margin-top: 8px;
}

.loading-text {
  color: rgba(255, 255, 255, 0.5);
  font-size: 14px;
  animation: pulseText 1.5s ease-in-out infinite;
}

@keyframes pulseText {
  0%, 100% {
    opacity: 0.5;
  }
  50% {
    opacity: 1;
  }
}
</style>