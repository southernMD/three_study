import { defineConfig } from 'vite'
import path from 'path'
import vue from '@vitejs/plugin-vue'
import generateRoutes from './plugins/generate-routes';
import {nodePolyfills} from 'vite-plugin-node-polyfills'
// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue(),nodePolyfills(),generateRoutes()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name].js`,
        chunkFileNames: `assets/[name].js`,
        assetFileNames: `assets/[name].[ext]`,
      },
    },
  },
  optimizeDeps: {
    include: ['ammo.js'],
  },
})
