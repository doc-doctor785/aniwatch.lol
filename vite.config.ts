import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom')) {
            return 'react-and-dom';
          }
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        },
      },
    },
  },
  
  plugins: [
    react(),
    ViteImageOptimizer({
      svg: {
        multipass: true,
        plugins: [
          // preset-default должен быть первым
          {
            name: 'preset-default',
            params: {
              overrides: {
                // removeViewBox не является частью preset-default, поэтому его нужно убрать отсюда
                cleanupIds: false,
              },
            },
          },
          // removeViewBox нужно добавлять как отдельный плагин
          'removeViewBox',
        ],
      },
    }),
  ],
  
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));