/**
 * @fileoverview Configuration loader
 * 
 * Loads scoring configuration from YAML file.
 * This is designed to be easily extensible - in the future we could load from
 * Azure Blob Storage or other sources by implementing a different loader.
 */

import { readFile } from 'fs/promises';
import { load as parseYaml } from 'js-yaml';
import { ScoringConfig, AppConfig } from '../types/index.js';

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
            throw new Error('Invalid scoring config: missing required fields');
        }

        return config;
    } catch (error) {
        // Re-throw with more context for easier debugging
        throw new Error(`Failed to load scoring config from ${configPath}: ${error}`);
    }
}

/**
 * Load application configuration
 * 
 * STRATEGY (Twelve-Factor App):
 * 1. Environment Variables (Highest Priority - for Containers/K8s)
 * 2. Local config.json (Fallback - for Local Development)
 * 3. Hardcoded Defaults (Sensible basics)
 * 
 * @param configPath - Path to the optional JSON configuration file
 * @returns Merged application configuration
 * @throws Error if critical configuration (database.url) is missing
 */
export async function loadAppConfig(configPath: string): Promise<AppConfig> {
    let fileConfig: Partial<AppConfig> = {};

    // 1. Try to load config.json (Optional)
    try {
        const fileContent = await readFile(configPath, 'utf-8');
        fileConfig = JSON.parse(fileContent);
    } catch (error) {
        // Silently ignore if file is missing; we might have ENV vars
        // console.log(`ℹ️ No config.json found at ${configPath}, relying on Environment Variables.`);
    }

    // 2. Build the final config with JSON Priority (Primary: config.json, Secondary: Env)
    const config: AppConfig = {
        azure: {
            environments: fileConfig.azure?.environments || [],
        },
        database: {
            url: fileConfig.database?.url || process.env.DATABASE_URL || '',
        },
        devops: {
            pat: fileConfig.devops?.pat || process.env.ADO_PAT || 'your-read-only-pat',
            organization: fileConfig.devops?.organization || process.env.ADO_ORG || 'your-org',
        },
        server: {
            port: parseInt(String(fileConfig.server?.port || process.env.PORT || 3001), 10),
            logLevel: fileConfig.server?.logLevel || process.env.LOG_LEVEL || 'info',
            host: fileConfig.server?.host || process.env.HOST || '0.0.0.0',
        },
        storagePath: fileConfig.storagePath || process.env.STORAGE_PATH || '',
        gitLocalOnly: fileConfig.gitLocalOnly !== undefined ? fileConfig.gitLocalOnly : (process.env.GIT_LOCAL_ONLY === 'true'),
        gitLocalPath: fileConfig.gitLocalPath || process.env.GIT_LOCAL_PATH || '',
        useBackendMocks: fileConfig.useBackendMocks !== undefined ? fileConfig.useBackendMocks : (process.env.USE_BACKEND_MOCKS === 'true')
    };

    // 3. FAIL-FAST: Validate critical configuration
    if (!config.database.url) {
        console.error('❌ FATAL: DATABASE_URL is not set via environment or config.json');
        throw new Error('Missing critical configuration: database.url');
    }

    return config;
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

/**
 * Global application configuration state
 */
let globalAppConfig: AppConfig | null = null;

export function setAppConfig(config: AppConfig): void {
    globalAppConfig = config;
}

export function getAppConfig(): AppConfig {
    if (!globalAppConfig) {
        throw new Error('App config not initialized. Call setAppConfig first.');
    }
    return globalAppConfig;
}

/**
 * Alias for getAppConfig to handle case-sensitivity issues during migration
 */
export const getAppconfig = getAppConfig;
