import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');
    
    return {
      // Only expose VITE_ prefixed variables to the client for security
      define: {
        // Note: We don't need to define process.env here since we're using import.meta.env
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
