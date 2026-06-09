<template>
  <div class="feedback-page">
    <div class="page-header">
      <button class="back-btn" @click="goBack">← 返回</button>
      <h2>问题反馈</h2>
      <p class="subtitle">感谢您的反馈，我们会尽快处理</p>
    </div>

    <div class="notice-card">
      <div class="notice-icon">⚠️</div>
      <div class="notice-content">
        <h3>星智IM 大重构焕新通知</h3>
        <p>由于星智IM (StarIM) 正在进行全面重构升级，部分功能可能存在一些bug。如果您在使用过程中发现任何问题或有改进建议，请通过下方表单提交反馈，我们会逐一修复。感谢您的理解与支持！</p>
      </div>
    </div>

    <div class="feedback-form">
      <div class="form-group">
        <label>反馈类型</label>
        <select v-model="form.type" class="form-control">
          <option value="bug">🐛 发现bug</option>
          <option value="feature">✨ 新功能建议</option>
          <option value="suggestion">💡 改进建议</option>
          <option value="other">📝 其他</option>
        </select>
      </div>

      <div class="form-group">
        <label>标题</label>
        <input 
          v-model="form.title" 
          type="text" 
          class="form-control" 
          placeholder="请简要描述您的反馈"
        />
      </div>

      <div class="form-group">
        <label>详细描述</label>
        <textarea 
          v-model="form.content" 
          class="form-control" 
          rows="6" 
          placeholder="请详细描述问题或建议，包括出现的场景、步骤等"
        ></textarea>
      </div>

      <div class="form-group">
        <label>截图（可选）</label>
        <div class="upload-area" @click="triggerUpload" @dragover.prevent @drop.prevent="handleDrop">
          <div class="upload-icon">📷</div>
          <p>点击或拖拽上传截图</p>
          <p class="hint">支持 JPG、PNG 格式，最多5张</p>
        </div>
        <input type="file" ref="fileInput" class="hidden-input" multiple accept="image/jpeg,image/png" @change="handleFileSelect" />
        <div v-if="form.screenshots.length > 0" class="preview-images">
          <div v-for="(img, index) in form.screenshots" :key="index" class="preview-item">
            <img :src="img" />
            <button @click="removeScreenshot(index)" class="remove-btn">×</button>
          </div>
        </div>
      </div>

      <button @click="submitFeedback" class="submit-btn" :disabled="!canSubmit">
        提交反馈
      </button>
    </div>

    <div v-if="submitted" class="success-message">
      <div class="success-icon">✅</div>
      <h3>反馈提交成功！</h3>
      <p>感谢您的反馈，我们会尽快处理并回复您。</p>
      <button @click="resetForm" class="reset-btn">继续反馈</button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue';
import { useRouter } from 'vue-router';
import { feedbackApi } from '@/api';
import { useToastStore } from '@/stores/toast';

const router = useRouter();
const toastStore = useToastStore();

const form = reactive({
  type: 'bug',
  title: '',
  content: '',
  screenshots: []
});

const submitted = ref(false);
const fileInput = ref(null);

const canSubmit = computed(() => {
  return form.title.trim().length > 0 && form.content.trim().length > 0;
});

function goBack() {
  router.back();
}

function triggerUpload() {
  fileInput.value?.click();
}

function handleFileSelect(event) {
  const files = event.target.files;
  Array.from(files).forEach(file => {
    if (form.screenshots.length >= 5) {
      toastStore.warning('最多只能上传5张图片');
      return;
    }
    processFile(file);
  });
  event.target.value = '';
}

function handleDrop(event) {
  const files = event.dataTransfer.files;
  Array.from(files).forEach(file => {
    if (form.screenshots.length >= 5) {
      toastStore.warning('最多只能上传5张图片');
      return;
    }
    processFile(file);
  });
}

function processFile(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    form.screenshots.push(e.target.result);
  };
  reader.readAsDataURL(file);
}

function removeScreenshot(index) {
  form.screenshots.splice(index, 1);
}

async function submitFeedback() {
  if (!canSubmit.value) return;

  try {
    const res = await feedbackApi.submit({
      type: form.type,
      title: form.title,
      content: form.content,
      screenshots: form.screenshots
    });

    if (res.ok) {
      toastStore.success('反馈提交成功');
      submitted.value = true;
    } else {
      toastStore.error(res.msg || '提交失败');
    }
  } catch (error) {
    toastStore.error('提交失败，请稍后重试');
  }
}

function resetForm() {
  form.type = 'bug';
  form.title = '';
  form.content = '';
  form.screenshots = [];
  submitted.value = false;
}
</script>

<style scoped>
.feedback-page {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  overflow-y: auto;
  box-sizing: border-box;
}

.page-header {
  text-align: center;
  margin-bottom: 24px;
  position: relative;
}

.back-btn {
  position: absolute;
  left: 0;
  top: 0;
  background: none;
  border: none;
  font-size: 14px;
  color: var(--primary);
  cursor: pointer;
  padding: 8px;
}

.back-btn:hover {
  color: var(--primary-dark);
}

.page-header h2 {
  font-size: 24px;
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.subtitle {
  color: #666;
  margin: 0;
}

.notice-card {
  background: linear-gradient(135deg, #fff3cd 0%, #ffeeba 100%);
  border: 1px solid #ffeeba;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  gap: 16px;
}

.notice-icon {
  font-size: 32px;
  flex-shrink: 0;
}

.notice-content h3 {
  color: #856404;
  margin: 0 0 8px 0;
  font-size: 16px;
}

.notice-content p {
  color: #856404;
  margin: 0;
  font-size: 14px;
  line-height: 1.6;
}

.feedback-form {
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: #333;
}

.form-control {
  width: 100%;
  padding: 12px;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  font-size: 14px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-control:focus {
  outline: none;
  border-color: var(--primary);
}

.form-control::placeholder {
  color: #999;
}

textarea.form-control {
  resize: vertical;
}

.upload-area {
  border: 2px dashed #ddd;
  border-radius: 8px;
  padding: 32px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s;
}

.upload-area:hover,
.upload-area.dragover {
  border-color: var(--primary);
  background: #faf6ef;
}

.upload-icon {
  font-size: 48px;
  margin-bottom: 12px;
}

.upload-area p {
  margin: 0 0 4px 0;
  color: #666;
}

.hint {
  font-size: 12px !important;
  color: #999 !important;
}

.hidden-input {
  display: none;
}

.preview-images {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
}

.preview-item {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 8px;
  overflow: hidden;
}

.preview-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-btn {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  border-radius: 50%;
  color: #fff;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn {
  width: 100%;
  padding: 14px;
  background: var(--gradient-primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.3s;
}

.submit-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.submit-btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.success-message {
  text-align: center;
  padding: 48px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.success-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.success-message h3 {
  color: var(--text-primary);
  margin: 0 0 8px 0;
}

.success-message p {
  color: #666;
  margin: 0 0 24px 0;
}

.reset-btn {
  padding: 12px 32px;
  background: var(--primary);
  color: #fff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
}

.reset-btn:hover {
  opacity: 0.9;
}
</style>
