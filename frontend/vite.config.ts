import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // React core
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'vendor-react';
          }
          // Router
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'vendor-zustand';
          }
          // Supabase
          if (id.includes('node_modules/@supabase')) {
            return 'vendor-supabase';
          }
          // i18n
          if (id.includes('node_modules/i18next') || id.includes('node_modules/react-i18next')) {
            return 'vendor-i18n';
          }
          // Icons
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          // Tanstack Query
          if (id.includes('node_modules/@tanstack')) {
            return 'vendor-query';
          }
          // Axios
          if (id.includes('node_modules/axios')) {
            return 'vendor-axios';
          }
        },
      },
    },
  },
});
