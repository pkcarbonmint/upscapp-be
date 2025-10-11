import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Only use base path in production builds
  base: process.env.NODE_ENV === 'production' ? '/faculty/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'shared-ui-library': path.resolve(__dirname, '../shared-ui-library/src'),
    },
  },
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 3001,
    strictPort: true,
    hmr: {
      port: 3001,
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
