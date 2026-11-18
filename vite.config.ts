import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3002,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8089',
        changeOrigin: true,
        secure: false,
      },
      '/ws': {
        target: 'http://localhost:8089',
        ws: true,
        changeOrigin: true,
      },
    },
  },
});
