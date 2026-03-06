import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
        },
    },
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:3000',
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: false,
        rollupOptions: {
            output: {
                manualChunks: function (id) {
                    if (!id.includes('node_modules')) {
                        return;
                    }
                    if (id.includes('react/') ||
                        id.includes('react-dom/') ||
                        id.includes('react-router-dom/')) {
                        return 'react-vendor';
                    }
                    if (id.includes('recharts')) {
                        return 'recharts-vendor';
                    }
                    if (id.includes('framer-motion') ||
                        id.includes('lucide-react')) {
                        return 'motion-icons-vendor';
                    }
                    if (id.includes('@radix-ui') ||
                        id.includes('class-variance-authority') ||
                        id.includes('clsx') ||
                        id.includes('tailwind-merge') ||
                        id.includes('tailwindcss-animate')) {
                        return 'ui-vendor';
                    }
                    if (id.includes('@tanstack/react-query') ||
                        id.includes('axios') ||
                        id.includes('zustand') ||
                        id.includes('date-fns')) {
                        return 'data-vendor';
                    }
                },
            },
        },
    },
});
