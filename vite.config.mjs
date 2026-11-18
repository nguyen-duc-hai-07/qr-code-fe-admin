import path from 'path';
import { fileURLToPath } from 'url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
