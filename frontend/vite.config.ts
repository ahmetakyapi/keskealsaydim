/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// The local Go API (`go run ./cmd/server/`) listens on 3000 by default.
// Change the port here if you start it elsewhere — an env var was tried and
// does not reach the config at evaluation time, so this stays explicit.
const API_PROXY = {
  target: 'http://localhost:3000',
  changeOrigin: true,
} as const;

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: { '/api': API_PROXY },
  },
  // `vite preview` serves the production build. Without the same proxy every
  // /api call 404s, which makes previewing a real build useless.
  preview: {
    port: 4173,
    proxy: { '/api': API_PROXY },
  },
  // The suite covers the pure logic layer (formatting, normalisers, chart
  // maths). Those are where this project's real defects lived — a lost minus
  // sign, a currency ignored, Turkish casing — and they need no DOM.
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return;
          }

          if (
            id.includes('react/') ||
            id.includes('react-dom/') ||
            id.includes('react-router-dom/')
          ) {
            return 'react-vendor';
          }

          if (
            id.includes('recharts')
          ) {
            return 'recharts-vendor';
          }

          if (
            id.includes('framer-motion') ||
            id.includes('lucide-react')
          ) {
            return 'motion-icons-vendor';
          }

          if (
            id.includes('@radix-ui') ||
            id.includes('class-variance-authority') ||
            id.includes('clsx') ||
            id.includes('tailwind-merge') ||
            id.includes('tailwindcss-animate')
          ) {
            return 'ui-vendor';
          }

          if (
            id.includes('@tanstack/react-query') ||
            id.includes('axios') ||
            id.includes('zustand') ||
            id.includes('date-fns')
          ) {
            return 'data-vendor';
          }
        },
      },
    },
  },
})
