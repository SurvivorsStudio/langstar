import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { DEFAULT_API_BASE_URL, FRONTEND_PORT } from './src/config/ports';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', 'VITE_');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      host: '0.0.0.0',
      port: FRONTEND_PORT,
      // 포트가 사용 중이면 다른 포트로 넘어가지 않고 실패 (백엔드 주소와 어긋나지 않도록)
      strictPort: true,
      proxy: {
        '/api': {
          target: env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL,
          changeOrigin: true,
        },
      },
    },
    preview: {
      host: '0.0.0.0',
      port: 80,
    },
  };
});
