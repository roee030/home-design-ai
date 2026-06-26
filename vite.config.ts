import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { execFileSync } from 'child_process'

const gitHash = (() => {
  try { return execFileSync('git', ['rev-parse', '--short', 'HEAD']).toString().trim() }
  catch { return 'local' }
})()

export default defineConfig({
  define: {
    __GIT_HASH__: JSON.stringify(gitHash),
  },
  plugins: [react()],
  base: '/home-design-ai/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  // In dev, proxy /api/* to the local Cloudflare Worker (wrangler dev on :8787)
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8787',
        changeOrigin: true,
      },
    },
  },
})
