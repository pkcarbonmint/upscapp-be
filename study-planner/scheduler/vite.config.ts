import { defineConfig } from 'vite'
import { resolve } from 'path'
import dts from 'vite-plugin-dts'

export default defineConfig({
  plugins: [
    dts({
      insertTypesEntry: true,
      rollupTypes: true,
      // Use main tsconfig for build
      tsconfigPath: './tsconfig.json',
    }),
  ],
  build: {
    lib: {
      entry: {
        index: resolve(__dirname, 'src/index.ts'),
      },
      name: 'HeliosTS',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        if (format === 'es') return `${entryName}.esm.js`;
        if (format === 'cjs') return `${entryName}.cjs.js`;
        return `${entryName}.js`;
      },
    },
    rollupOptions: {
      external: [

        // Pattern to match all node: imports
        /^node:/
      ],
      // Configure dynamic imports for code splitting
      output: {
        exports: 'named',
        manualChunks: {
        },
      },
    },
    minify: 'terser',
    sourcemap: true,
    target: 'es2020',
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
  },
})
