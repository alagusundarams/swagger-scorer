/// <reference types="vitest" />
import { loadEnv } from 'vite'
import { defineConfig, configDefaults } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api/v1': {
          target: env.VITE_API_URL || 'http://localhost:3001',
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
  }
})
