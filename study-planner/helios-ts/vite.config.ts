import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      // Use test-specific tsconfig to suppress unused variable warnings in test files
      tsconfigPath: './tsconfig.test.json',
    }),
  ],
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'HeliosTS',
      formats: ['es', 'cjs'],
      fileName: (format) => {
        if (format === 'es') return 'index.esm.js';
        if (format === 'cjs') return 'index.cjs.js';
        return 'index.js';
      },
    },
    rollupOptions: {
      external: ['firebase/app', 'firebase/auth'],
      // Configure dynamic imports for code splitting
      output: {
        exports: 'named',
        manualChunks: {
          // Create separate chunks for resource data
          'study-materials': ['./src/resources/data/study-materials.json'],
        },
      },
    },
    minify: 'terser',
    sourcemap: true,
    target: 'es2020',
  },
  // Include resource files in tests and development
  test: {
    environment: 'node',
    // Ensure test environment can access resource files
    setupFiles: ['./src/test-setup.ts'],
    // Use test-specific TypeScript config to suppress unused variable warnings
    typescript: {
      tsconfigPath: './tsconfig.test.json'
    }
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})
