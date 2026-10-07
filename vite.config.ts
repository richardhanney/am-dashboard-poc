import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ command, isPreview }) => ({
  plugins: [react()],
  base:
    command === 'serve' && !isPreview ? '/' : process.env.PAGES_BASE_PATH || '/am-dashboard-poc/',
  build: { outDir: 'dist', chunkSizeWarningLimit: 1600 },
}));
