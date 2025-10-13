import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/onboarding/',
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5173, // Vite default port
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('proxy error', err);
          });
          proxy.on('proxyReq', (_proxyReq, req, _res) => {
            console.log('Sending Request to the Target:', req.method, req.url);
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            console.log('Received Response from the Target:', proxyRes.statusCode, req.url);
          });
        },
      },
      '/helios': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "helios-ts": path.resolve(__dirname, "../helios-ts/src"),
      "shared-ui-library": path.resolve(__dirname, "../shared-ui-library/src"),
    },
    dedupe: ["helios-ts", "shared-ui-library"]
  },
  optimizeDeps: {
    exclude: ["helios-ts", "shared-ui-library"],
    include: ['react', 'react-dom', 'antd', 'jspdf', 'html2canvas', 'chart.js'] // Pre-bundle common dependencies
  },
  build: {
    commonjsOptions: {
      include: [/helios-ts/, /shared-ui-library/, /node_modules/]
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Separate helios-ts into its own chunk
          if (id.includes('helios-ts')) {
            return 'helios-ts';
          }
          // Separate shared-ui-library into its own chunk
          if (id.includes('shared-ui-library')) {
            return 'shared-ui-library';
          }
          // Separate vendor dependencies
          if (id.includes('react') || id.includes('react-dom')) {
            return 'vendor-react';
          }
          if (id.includes('antd') || id.includes('@ant-design')) {
            return 'vendor-ui';
          }
          // Put other node_modules in vendor chunk
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    },
    // Increase chunk size warning limit temporarily
    chunkSizeWarningLimit: 1000
  },
  // Enable HMR
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
