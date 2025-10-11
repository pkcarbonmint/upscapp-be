import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  css: {
    postcss: './postcss.config.js',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      'plan-editor-library': path.resolve(__dirname, '../src')
    }
  },
  server: {
    port: 3001,
    open: true
  }
})
