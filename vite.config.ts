import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, res: any) => {
            if (res && !res.headersSent && typeof res.writeHead === 'function') {
              res.writeHead(503, { 'Content-Type': 'application/json' });
              res.end(
                JSON.stringify({
                  success: false,
                  offline: true,
                  error: 'Backend server is offline or restarting.',
                })
              );
            }
          });
        },
      },
      '/ws': {
        target: 'ws://127.0.0.1:3001',
        ws: true,
        configure: (proxy) => {
          proxy.on('error', (_err, _req, socket: any) => {
            if (socket && typeof socket.destroy === 'function') {
              socket.destroy();
            }
          });
        },
      },
    },
  },
});
