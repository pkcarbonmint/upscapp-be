import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@helios/helios-ts': path.resolve(__dirname, '../../libs/helios-ts'),
      '@helios/helios-scheduler': path.resolve(__dirname, '../../libs/helios-scheduler'),
    },
  },
})