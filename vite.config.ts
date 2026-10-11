import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from "path"

// https://vite.dev/config/
export default defineConfig(({ mode }) => {  
  return {
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    plugins: [react()],
    assetsInclude: ['**/*.svg'],
    
    // Use different HTML files for dev and production
    ...(mode === 'development' && {
      define: {
        __DEV_MODE__: true
      }
    }),
    
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: 'http://localhost:12113',
          changeOrigin: true,
          // Live video relays over WebSockets under /api too.
          ws: true
        },
        '/socket.io': {
          target: 'http://localhost:12113',
          ws: true
        }
      }
    },
    
    preview: {
      allowedHosts: true
    },
    
    build: {
      assetsDir: 'assets',
      copyPublicDir: true,

      // SEO and Performance Optimizations
      sourcemap: mode === 'development',

      // Minimize bundle size
      minify: 'esbuild',

    },
    
    define: {
      __APP_VERSION__: JSON.stringify('1.0.0'),
      __BUILD_DATE__: JSON.stringify(new Date().toISOString())
    },
    
    // Optimize dependencies for better performance
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom'],
      exclude: ['@vite/client', '@vite/env']
    }
  };
});
