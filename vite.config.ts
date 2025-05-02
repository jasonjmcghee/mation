import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  base: './',
  build: {
    outDir: 'docs',
    lib: {
      entry: resolve(__dirname, 'src/index.ts'),
      name: 'Mation',
      fileName: 'mation',
      formats: ['es']
    },
    rollupOptions: {
      // Make sure to externalize dependencies that shouldn't be bundled
      // into your library
      external: ['polymorph-js'],
      output: {
        // Provide global variables to use in the UMD build
        // for externalized deps
        globals: {
          'polymorph-js': 'Polymorph'
        }
      }
    },
    sourcemap: true
  }
});