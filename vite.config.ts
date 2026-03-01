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
            proxy: {
                '/api/vercel': {
                    target: 'https://gateway.ai.vercel.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/vercel/, '/v1'),
                },
                '/api/alibaba': {
                    target: 'https://dashscope.aliyuncs.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/alibaba/, '/compatible-mode/v1'),
                },
                '/api/xai': {
                    target: 'https://api.x.ai',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/xai/, '/v1'),
                },
                '/api/openai': {
                    target: 'https://api.openai.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/openai/, '/v1'),
                },
                '/api/anthropic': {
                    target: 'https://api.anthropic.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/anthropic/, '/v1'),
                },
                '/api/deepseek': {
                    target: 'https://api.deepseek.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/deepseek/, '/v1'),
                },
                '/api/mistral': {
                    target: 'https://api.mistral.ai',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/mistral/, '/v1'),
                },
                '/api/perplexity': {
                    target: 'https://api.perplexity.ai',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/perplexity/, ''),
                },
                '/api/cohere': {
                    target: 'https://api.cohere.ai',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/cohere/, '/compatibility/v1'),
                },
                '/api/openrouter': {
                    target: 'https://openrouter.ai',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/openrouter/, '/api/v1'),
                },
                '/api/moonshot': {
                    target: 'https://api.moonshot.cn',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/moonshot/, '/v1'),
                },
                '/api/zhipu': {
                    target: 'https://open.bigmodel.cn',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/zhipu/, '/api/paas/v4'),
                },
                '/api/google': {
                    target: 'https://generativelanguage.googleapis.com',
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api\/google/, '/v1beta'),
                },
            },
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
                '@': path.resolve(__dirname, '.'),
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
            setupFiles: ['./test/setup.ts'],
            include: ['**/*.{test,spec}.{js,ts,tsx}'],
            coverage: {
                provider: 'v8',
                reporter: ['text', 'json', 'html'],
            },
        },
    };
});
