import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      define: {
        // Vite automatically handles VITE_ prefixed variables
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      server: {
        port: 5173,
        open: true,
      },
      build: {
        outDir: 'dist',
        sourcemap: mode === 'development',
        minify: mode === 'production',
        rollupOptions: {
          output: {
            manualChunks: {
              'react-vendor': ['react', 'react-dom'],
              'chart-vendor': ['recharts'],
              'export-vendor': ['jspdf', 'jspdf-autotable', 'xlsx'],
            }
          }
        }
      },
      optimizeDeps: {
        include: ['react', 'react-dom', 'recharts', 'jspdf', 'xlsx', '@google/genai']
      }
    };
});
