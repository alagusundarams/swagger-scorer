/**
 * @fileoverview Simple test for config loader
 * 
 * Tests that we can load and validate the scoring configuration from YAML.
 * This is a straightforward test with NO MOCKING - we test the real file.
 */

import { describe, it, expect } from 'vitest';
import { loadConfig, validateConfig } from './loader.js';
import { resolve } from 'path';

describe('Config Loader', () => {
    /**
     * Test: Load the real scoring config file
     * 
     * Why: We want to make sure our config file is valid YAML and has all required fields
     * How: Load the actual config/scoring-config.yaml file
     * No mocking: We test with the real config file
     */
    it('should load scoring config from YAML file', async () => {
        // Get path to the real config file (going up from src/config to config/)
        const configPath = resolve(process.cwd(), 'config/scoring-config.yaml');

        // Load the config
        const config = await loadConfig(configPath);

        // Verify it has the expected structure
        expect(config).toBeDefined();
        expect(config.version).toBe('2.0');
        expect(config.categories).toBeDefined();

        // Many violations to get score in amber range (70-89)
        // Documentation weight is 15. If we have 50 errors:
        // Category Score = 100 - 50 = 50.
        // Overall impact = (50 * 15 / 100) + (100 * 85 / 100) = 7.5 + 85 = 92.5 (Still Green!)

        // We need more impact. Let's add errors to security (weight 30):
        // Note: Violation type is not defined in this file, assuming it's imported or defined elsewhere
        // For the purpose of this test, we'll comment out the type annotation if it causes issues.
        // const amberViolations: Violation[] = Array(50)
        //     .fill(null)
        //     .map((_, i) => ({
        //         rule: `rule-${i}`,
        //         severity: 'error' as const,
        //         message: 'Test violation',
        //         path: 'test',
        //         line: 1,
        //         category: i % 2 === 0 ? 'security' : 'apiDesign', // Weight 30 + 20 = 50
        //     }));

        // If 25 errors in security: 100 - 25 = 75. (75 * 0.3 = 22.5)
        // If 25 errors in apiDesign: 100 - 25 = 75. (75 * 0.2 = 15)
        // Others: 100 * 0.5 = 50
        // Total = 22.5 + 15 + 50 = 87.5 (Amber)
        expect(config.thresholds).toBeDefined();
    });

    /**
     * Test: Validate that category weights sum to 100
     * 
     * Why: If weights don't sum to 100, the scoring math won't work correctly
     * How: Load config and run validation
     * What we're checking: Sum of all enabled category weights = exactly 100
     */
    it('should validate that category weights sum to 100', async () => {
        const configPath = resolve(process.cwd(), 'config/scoring-config.yaml');
        const config = await loadConfig(configPath);

        // This should not throw an error if config is valid
        expect(() => validateConfig(config)).not.toThrow();
    });

    /**
     * Test: Handle invalid config path gracefully
     * 
     * Why: If someone provides a wrong path, we should give a helpful error
     * How: Try to load a file that doesn't exist
     * What we're checking: Error message is clear about what went wrong
     */
    it('should throw error for invalid config path', async () => {
        // Try to load a file that doesn't exist
        await expect(loadConfig('/does/not/exist.yaml')).rejects.toThrow(
            'Failed to load scoring config'
        );
    });
});
