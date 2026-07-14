import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: process.env.PORT ? Number(process.env.PORT) : 5173,
        host: true,
        allowedHosts: ['192.168.*']
    },
    build: {
        target: 'es2015',
        rollupOptions: {
            output: {
                manualChunks: {
                    supabase: ['@supabase/supabase-js']
                }
            }
        }
    }
});
