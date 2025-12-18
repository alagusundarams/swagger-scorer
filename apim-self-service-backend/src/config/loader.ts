/**
 * @fileoverview Configuration loader
 * 
 * Loads scoring configuration from YAML file.
 * This is designed to be easily extensible - in the future we could load from
 * Azure Blob Storage or other sources by implementing a different loader.
 */

import { readFile } from 'fs/promises';
import { load as parseYaml } from 'js-yaml';
import { ScoringConfig } from '../types/index.js';

/**
 * Load scoring configuration from local YAML file
 * 
 * @param configPath - Path to the YAML configuration file
 * @returns Parsed scoring configuration
 * @throws Error if file cannot be read or YAML is invalid
 */
export async function loadConfig(configPath: string): Promise<ScoringConfig> {
    try {
        // Read the YAML file from disk
        const fileContent = await readFile(configPath, 'utf-8');

        // Parse YAML into JavaScript object
        const config = parseYaml(fileContent) as ScoringConfig;

        // Basic validation: ensure required fields exist
        if (!config.categories || !config.thresholds) {
            throw new Error('Invalid config: missing required fields');
        }

        return config;
    } catch (error) {
        // Re-throw with more context for easier debugging
        throw new Error(`Failed to load config from ${configPath}: ${error}`);
    }
}

/**
 * Validate that category weights sum to 100
 * This is a sanity check to ensure the scoring makes sense
 * 
 * @param config - Scoring configuration to validate
 * @throws Error if weights don't sum to 100
 */
export function validateConfig(config: ScoringConfig): void {
    const totalWeight = Object.values(config.categories)
        .filter((cat) => cat.enabled)
        .reduce((sum, cat) => sum + cat.weight, 0);

    if (totalWeight !== 100) {
        throw new Error(
            `Category weights must sum to 100, got ${totalWeight}`
        );
    }
}
