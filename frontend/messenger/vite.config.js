import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Docker service targets (overridden by env vars when running inside Docker)
const BACKEND_URL = process.env.VITE_BACKEND_URL || 'http://localhost:3001';
const CALLING_URL = process.env.VITE_CALLING_SERVICE_URL || 'http://localhost:3003';
const MESSAGE_URL = process.env.VITE_MESSAGE_SERVICE_URL || 'http://localhost:3004';
const CLASS_URL = process.env.VITE_CLASS_SERVICE_URL || 'http://localhost:3005';
const FORM_URL = process.env.VITE_FORM_SERVICE_URL || 'http://localhost:3006';
const ALARM_URL = process.env.VITE_ALARM_SERVICE_URL || 'http://localhost:3007';
const SOCIAL_URL = process.env.VITE_SOCIAL_SERVICE_URL || 'http://localhost:3008';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3002,
    proxy: {
      // class-group/files → api-service (file uploads stay on api-service)
      '/api/class-group/files': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // class-group/alertness → alarm-service
      '/api/class-group/alertness': {
        target: ALARM_URL,
        changeOrigin: true,
      },
      // class-group/assignments → form-service
      '/api/class-group/assignments': {
        target: FORM_URL,
        changeOrigin: true,
      },
      // class-group/* → class-service (classes, attendance)
      '/api/class-group': {
        target: CLASS_URL,
        changeOrigin: true,
      },
      // messages → message-service
      '/api/messages': {
        target: MESSAGE_URL,
        changeOrigin: true,
      },
      // forms → form-service
      '/api/forms': {
        target: FORM_URL,
        changeOrigin: true,
      },
      // alarm → alarm-service
      '/api/alarm': {
        target: ALARM_URL,
        changeOrigin: true,
      },
      // social → social-service
      '/api/social': {
        target: SOCIAL_URL,
        changeOrigin: true,
      },
      // Generic /api → api-service (auth, user, conversations, notices, etc.)
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Socket.io → api-service
      '/socket.io': {
        target: BACKEND_URL,
        changeOrigin: true,
        ws: true,
      },
      // Calling service REST API
      '/calling-api': {
        target: CALLING_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/calling-api/, ''),
      },
      // Calling service socket
      '/calling-socket': {
        target: CALLING_URL,
        changeOrigin: true,
        ws: true,
      },
    },
  },
  plugins: [
    react({
      babel: {
        plugins: ['babel-plugin-react-compiler'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@components': path.resolve(__dirname, './src/components'),
      '@utils': path.resolve(__dirname, './src/utils'),
    },
  },
  build: {
    sourcemap: false, 
  },
});