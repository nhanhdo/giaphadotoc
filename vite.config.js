import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { fileURLToPath } from 'node:url';

export default defineConfig(({ command, mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  // Build production mà thiếu VITE_API_URL -> app gọi nhầm /api của chính Vercel và hỏng hoàn toàn.
  // Trên Vercel: dừng build với thông báo rõ ràng; build ở máy local: chỉ cảnh báo.
  if (command === 'build' && !env.VITE_API_URL) {
    const msg = '[giapha] Thiếu biến môi trường VITE_API_URL (URL backend Railway, vd https://giapha-api.up.railway.app).';
    if (process.env.VERCEL) throw new Error(`${msg} Vào Vercel → Settings → Environment Variables để thêm, rồi Redeploy.`);
    console.warn(`${msg} Bản build này chỉ chạy được khi frontend và backend cùng domain.`);
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      // src/shared: bản sao thuật toán lịch Âm / xưng hô từ repo backend (giữ đồng bộ)
      alias: { '@shared': fileURLToPath(new URL('./src/shared', import.meta.url)) },
    },
    server: {
      port: 5173,
      proxy: { '/api': { target: process.env.API_URL || 'http://127.0.0.1:4100', changeOrigin: true } },
    },
  };
});
