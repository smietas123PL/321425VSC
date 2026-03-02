import { defineConfig } from 'vite';

export default defineConfig({
    server: {
        port: 3000,
        open: true,
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
        manifest: true,
        // When we migrate fully to TS, we can adjust this
        target: 'es2020',
    },
});
