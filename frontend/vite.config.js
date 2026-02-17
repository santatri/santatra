import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { Buffer } from 'buffer';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],

  define: {
    'process.env': {},
    'process.browser': true,
    'global': 'window',
    'Buffer': JSON.stringify(Buffer),
  },

  optimizeDeps: {
    include: [
      'jspdf',
      'buffer',
      '@react-pdf/renderer',
      'socket.io-client'
    ],
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    }
  },

  server: {
    proxy: {
      '/socket.io': {
        target: 'https://afa-s80u.onrender.com',
        changeOrigin: true,
        ws: true,
      },
      '/api': {
        target: 'https://afa-s80u.onrender.com',
        changeOrigin: true,
      }
    }
  },

  resolve: {
    alias: {
      buffer: 'buffer/',
      stream: 'stream-browserify',
      util: 'util/',
    }
  },

  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    }
  }
});