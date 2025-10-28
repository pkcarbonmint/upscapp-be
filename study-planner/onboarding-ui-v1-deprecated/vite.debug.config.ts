import path from "path"
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Debug configuration for testing PreviewStep
export default defineConfig({
  plugins: [react()],
  root: '.',
  publicDir: 'public',
  server: {
    host: '0.0.0.0', // Allow external connections
    port: 5175, // Different port for debug app
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
    },
    dedupe: ["helios-ts"]
  },
  optimizeDeps: {
    exclude: ["helios-ts"]
  },
  build: {
    commonjsOptions: {
      include: [/helios-ts/, /node_modules/]
    }
  },
  // Enable HMR
  define: {
    __DEV__: JSON.stringify(process.env.NODE_ENV === 'development'),
  },
})
