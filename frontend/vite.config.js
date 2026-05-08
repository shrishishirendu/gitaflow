import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite proxies /api/* to the FastAPI backend during dev so the
// frontend can call relative URLs without CORS hassle.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
});
