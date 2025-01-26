import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
// vite.config.js
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/reportes': {
        target: 'http://198.244.132.50:8008',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/reportes/, '')
      }
    }
  }
})