<template>
  <div class="avatar" :class="sizeClass" :style="customStyle">
    <img v-if="imgSrc" :src="imgSrc" :alt="name" @error="handleError" />
    <span v-else>{{ initials }}</span>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    default: ''
  },
  size: {
    type: String,
    default: 'md', // sm, md, lg, xl
    validator: (v) => ['sm', 'md', 'lg', 'xl'].includes(v)
  }
});

const imgError = ref(false);

watch(() => props.src, () => {
  imgError.value = false;
});

const imgSrc = computed(() => {
  if (imgError.value || !props.src) return '';
  if (props.src.startsWith('http://')) {
    return `/api/image/proxy?url=${encodeURIComponent(props.src)}`;
  }
  return props.src;
});

const initials = computed(() => {
  if (!props.name) return '?';
  return props.name.charAt(0).toUpperCase();
});

const sizeClass = computed(() => `avatar-${props.size}`);

const customStyle = computed(() => {
  if (props.name) {
    const hue = (props.name.charCodeAt(0) * 37) % 360;
    return imgSrc.value 
      ? {} 
      : { background: `linear-gradient(135deg, hsl(${hue}, 70%, 60%), hsl(${(hue + 30) % 360}, 70%, 50%))` };
  }
  return {};
});

function handleError() {
  imgError.value = true;
}
</script>
