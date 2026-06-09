import { defineStore } from 'pinia';
import { ref } from 'vue';

let nextId = 1;

export const useToastStore = defineStore('toast', () => {
  const toasts = ref([]);
  
  function show(message, type = 'info', duration = 3000) {
    const id = nextId++;
    const toast = { id, message, type };
    toasts.value.push(toast);
    
    if (duration > 0) {
      setTimeout(() => {
        remove(id);
      }, duration);
    }
    
    return id;
  }
  
  function remove(id) {
    const index = toasts.value.findIndex(t => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }
  
  function success(message, duration = 3000) {
    return show(message, 'success', duration);
  }
  
  function error(message, duration = 4000) {
    return show(message, 'error', duration);
  }
  
  function warning(message, duration = 3000) {
    return show(message, 'warning', duration);
  }
  
  function info(message, duration = 3000) {
    return show(message, 'info', duration);
  }
  
  return {
    toasts,
    show,
    remove,
    success,
    error,
    warning,
    info
  };
});
