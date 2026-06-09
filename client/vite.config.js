import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    port: 5173,
    host: '0.0.0.0',
    // 放行你的域名
    allowedHosts: ['starim.xingk.xyz'],
    cors: {
      origin: [
        'http://localhost:5173',
        'https://starim.xingk.xyz'
      ],
      credentials: true
    },
    proxy: {
      '/api': {
        target: 'http://localhost:3004',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3004',
        changeOrigin: true
      },
      '/socket.io': {
        target: 'http://localhost:3004',
        changeOrigin: true,
        ws: true
      }
    }
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia'],
          'utils-vendor': ['axios', 'socket.io-client']
        }
      }
    }
  }
});