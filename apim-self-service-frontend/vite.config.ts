/// <reference types="vitest" />
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api/v1': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
    css: false,
    deps: {
      optimizer: {
        web: {
          include: ['vitest-canvas-mock']
        }
      }
    },
    exclude: [...configDefaults.exclude, 'tests/e2e/**', 'e2e/**']
  },
})
