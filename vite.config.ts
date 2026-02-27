import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
        server: {
            port: 3000,
            host: '0.0.0.0',
        },
        plugins: [
            react(),
            tailwindcss()
        ],
        define: {
            'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
            'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
        },
        resolve: {
            alias: {
                '@': path.resolve(__dirname, './src'),
            }
        },
        build: {
            target: 'esnext',
            minify: 'esbuild',
            sourcemap: mode === 'development',
            rollupOptions: {
                output: {
                    manualChunks: {
                        vendor: ['react', 'react-dom'],
                        markdown: ['react-markdown', 'remark-gfm', 'remark-math', 'rehype-katex', 'rehype-highlight'],
                        ui: ['react-virtuoso', 'dompurify'],
                    },
                },
            },
            chunkSizeWarningLimit: 1000,
        },
        optimizeDeps: {
            include: ['react', 'react-dom', 'react-markdown', 'react-virtuoso'],
        },
        test: {
            globals: true,
            environment: 'jsdom',
            setupFiles: ['./src/test/setup.ts'],
            include: ['src/**/*.{test,spec}.{js,ts,tsx}'],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
            },
        },
    };
});
