import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const BACKEND_URL = 'http://localhost:3001';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3002,
    proxy: {
      '/class-group': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/messages': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/conversations': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/conversation-keys': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/forms': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/alarm': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/social': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/auth': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/users': {
        target: BACKEND_URL,
        changeOrigin: true,
      },
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/socket.io': {
        target: BACKEND_URL,
        changeOrigin: true,
        ws: true,
      },
  
      '/calling-api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/calling-api/, ''),
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