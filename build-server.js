// ESM build script
import esbuild from 'esbuild';
import { mkdir } from 'fs/promises';

// Create dist directory if it doesn't exist
await mkdir('dist', { recursive: true });

// Build the server
await esbuild.build({
  entryPoints: ['server.js'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  outfile: 'dist/server.bundled.js',
  minify: false,
  format: 'cjs',
  banner: {
    js: '#!/usr/bin/env node',
  },
  logLevel: 'info',
}).catch(() => process.exit(1));

console.log('Server bundled successfully at dist/server.bundled.cjs');