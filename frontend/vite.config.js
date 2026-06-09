import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const BACKEND_URL = 'http://localhost:3001';

export default defineConfig({
  server: {
    host: '0.0.0.0',
    port: 3002,
    proxy: {
      // All API calls go through /api — Vite strips prefix before forwarding to backend
      // Matches nginx production behavior exactly
      '/api': {
        target: BACKEND_URL,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Socket.IO — no prefix needed, goes directly
      '/socket.io': {
        target: BACKEND_URL,
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