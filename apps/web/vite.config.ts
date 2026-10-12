import { defineConfig } from 'vitest/config';
import { loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { seoFiles } from './seo.plugin.js';

// Dev: /api/* is proxied to the local API so the browser stays same-origin (no CORS, cookies just work).
const apiTarget = process.env.API_PROXY_TARGET ?? 'http://localhost:4000';

export default defineConfig(({ mode }) => ({
  plugins: [react(), seoFiles(loadEnv(mode, process.cwd(), 'VITE_').VITE_SITE_URL)],
  // Allow the sandbox preview host (a leading dot matches all subdomains) plus localhost. Not a wildcard.
  server: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost'],
    proxy: {
      '/api': { target: apiTarget, changeOrigin: true },
    },
  },
  preview: {
    host: '0.0.0.0',
    allowedHosts: ['.e2b.app', 'localhost'],
  },
  build: {
    target: 'es2020',
    sourcemap: false,
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        // Stable vendor chunks: the app code changes often, the libraries rarely.
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (/[\\/]node_modules[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return 'vendor-motion';
          if (/[\\/]node_modules[\\/](i18next|react-i18next|i18next-[^\\/]+)[\\/]/.test(id)) return 'vendor-i18n';
          if (/[\\/]node_modules[\\/](react-hook-form|@hookform|zod)[\\/]/.test(id)) return 'vendor-forms';
          if (/[\\/]node_modules[\\/](react|react-dom|react-router|react-router-dom|scheduler)[\\/]/.test(id)) return 'vendor-react';
          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}));
