import { createRouter, createWebHashHistory } from 'vue-router';
import { useUserStore } from '@/stores/user';

const routes = [
  {
    path: '/',
    name: 'Welcome',
    component: () => import('@/views/WelcomeView.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/LoginView.vue'),
    meta: { requiresAuth: false, hideForAuth: true }
  },
  {
    path: '/register',
    name: 'Register',
    component: () => import('@/views/RegisterView.vue'),
    meta: { requiresAuth: false, hideForAuth: true }
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('@/views/ChatView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/contacts',
    name: 'Contacts',
    component: () => import('@/views/ContactsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/moments',
    name: 'Moments',
    component: () => import('@/views/MomentsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/public-accounts',
    name: 'PublicAccounts',
    component: () => import('@/views/PublicAccountsView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/profile',
    name: 'Profile',
    component: () => import('@/views/ProfileView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/feedback',
    name: 'Feedback',
    component: () => import('@/views/FeedbackView.vue'),
    meta: { requiresAuth: true }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('@/views/AdminView.vue'),
    meta: { requiresAuth: true, requiresAdmin: true }
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/'
  }
];

const router = createRouter({
  history: createWebHashHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const userStore = useUserStore();
  
  if (!userStore.isLoggedIn) {
    userStore.restoreFromStorage();
  }
  
  if (to.meta.requiresAuth && !userStore.isLoggedIn) {
    next({ path: '/login', query: { redirect: to.fullPath } });
    return;
  }
  
  if (to.meta.hideForAuth && userStore.isLoggedIn) {
    next('/chat');
    return;
  }
  
  if (to.meta.requiresAdmin && !userStore.isAdmin) {
    next('/chat');
    return;
  }
  
  next();
});

export default router;