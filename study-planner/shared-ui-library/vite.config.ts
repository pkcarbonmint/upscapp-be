import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    react(),
    dts({
      insertTypesEntry: true,
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'SharedUILibrary',
      formats: ['es'],
      fileName: () => 'index.esm.js',
    },
    rollupOptions: {
      external: ['react', 'react-dom', 'lucide-react', 'firebase/app', 'firebase/auth'],
      output: {
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'lucide-react': 'LucideReact',
        },
      },
    },
    // Disable minification for debugging
    minify: false,
    // Enable source maps for debugging
    sourcemap: true,
  },
})
