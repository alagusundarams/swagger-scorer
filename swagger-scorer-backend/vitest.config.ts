import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        // Enable global test APIs (describe, it, expect) without imports
        globals: true,

        // Run tests in Node environment
        environment: 'node',

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'dist/',
                'tests/',
                '**/*.test.ts',
                '**/*.config.ts'
            ],
            // Coverage thresholds (fail if below)
            lines: 80,
            functions: 80,
            branches: 80,
            statements: 80
        },

        // Test file patterns
        include: ['src/**/*.test.ts'],

        // Timeout for tests (30 seconds)
        testTimeout: 30000
    }
});
