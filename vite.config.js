
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
    build: {
        rollupOptions: {
            input: {
                main: resolve(__dirname, 'index.html'),
                driver: resolve(__dirname, 'driver.html'),
                admin: resolve(__dirname, 'admin.html'),
            },
        },
    },
});
