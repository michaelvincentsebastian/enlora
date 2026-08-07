import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8001',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/status': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/setup': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/health': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/upload': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
      '/artifacts': {
        target: 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
