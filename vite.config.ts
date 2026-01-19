
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    // Garante que process.env.API_KEY funcione no navegador
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
    'process.env': {}
  },
  server: {
    port: 3000
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: './index.html'
    }
  }
});
