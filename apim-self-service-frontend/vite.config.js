/// <reference types="vitest" />
import { loadEnv } from 'vite';
import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import federation from "@originjs/vite-plugin-federation";
// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
    // Load env file based on `mode` in the current working directory.
    // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
    const env = loadEnv(mode, process.cwd(), '');
    return {
        plugins: [
            react(),
            federation({
                name: 'apim_self_service',
                filename: 'remoteEntry.js',
                // Modules to expose
                exposes: {
                    './PolicyEditor': './src/pages/PolicyEditor/PolicyEditor.page.tsx',
                    './OnboardingApiPolicyStep': './src/features/provisioning/components/OnboardingApiPolicyStep.tsx',
                    './DashboardPage': './src/pages/Dashboard/Dashboard.page.tsx',
                    './GlobalInventoryPage': './src/pages/GlobalInventory/GlobalInventory.page.tsx',
                    './OnboardingPage': './src/pages/Onboarding/Onboarding.page.tsx',
                    './AdminGovernancePage': './src/pages/AdminGovernance/AdminGovernance.page.tsx',
                    './SpecStudio': './src/features/spec-studio/index.ts',
                    './PromotionWizard': './src/features/inventory/components/product/PromotionWizard.tsx'
                },
                shared: ['react', 'react-dom', 'react-router-dom', 'zustand']
            })
        ],
        build: {
            target: 'esnext' // Required for Top-level await
        },
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
    };
});
