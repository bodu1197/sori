import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

// Chunk grouping helper functions
function getVendorChunk(id: string): string | undefined {
  if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
    return 'vendor-react';
  }
  if (id.includes('zustand') || id.includes('supabase')) {
    return 'vendor-state';
  }
  if (id.includes('i18next')) {
    return 'vendor-i18n';
  }
  if (id.includes('lucide')) {
    return 'vendor-icons';
  }
  return 'vendor';
}

function getPageChunk(pageName: string): string {
  if (pageName.includes('profile') || pageName.includes('edit')) {
    return 'page-profile';
  }
  if (pageName.includes('auth') || pageName.includes('login')) {
    return 'page-auth';
  }
  if (pageName.includes('message') || pageName.includes('chat')) {
    return 'page-messaging';
  }
  if (pageName.includes('search') || pageName.includes('chart')) {
    return 'page-discovery';
  }
  return 'page-' + pageName;
}

function getComponentChunk(id: string): string | undefined {
  if (id.includes('/stories/')) return 'component-stories';
  if (id.includes('/player/')) return 'component-player';
  if (id.includes('/profile/')) return 'component-profile';
  return undefined;
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            return getVendorChunk(id);
          }
          if (id.includes('/pages/')) {
            const match = id.match(/\/pages\/([^/]+)/);
            if (match) {
              const pageName = match[1].replace(/\.(tsx|ts)$/, '').toLowerCase();
              return getPageChunk(pageName);
            }
          }
          if (id.includes('/components/')) {
            return getComponentChunk(id);
          }
          return undefined;
        },
      },
    },
  },
});
