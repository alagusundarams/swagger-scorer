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
        expect(config.version).toBe('1.0');
        expect(config.categories).toBeDefined();
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
            'Failed to load config'
        );
    });
});
