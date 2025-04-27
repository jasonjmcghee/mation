import { defineConfig } from 'vite';

export default defineConfig({
  assetsInclude: ['**/*.wasm'],
  base: '/',
  build: {
    outDir: 'docs'
  }
});