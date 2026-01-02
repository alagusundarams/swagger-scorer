import { mkdir, writeFile, readFile, rm } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import pino from 'pino';
import { getAppConfig } from '../config/loader.js';

const logger = pino({
    transport: {
        target: 'pino-pretty',
        options: { colorize: true }
    }
});

/**
 * OnboardingStorageService
 * 
 * Handles storage of API specs in a staging area.
 * Uses the local file system, which in a K8s environment would be backed 
 * by a CSI driver (Azure Blob CSI) for persistence and cross-replica access.
 */
export class OnboardingStorageService {
    private stagingDir: string | null = null;
    private initialized: boolean = false;

    constructor() {
        // No longer calls getAppConfig() here to avoid module-load initialization errors
    }

    private async initialize() {
        if (this.initialized) return;

        const config = getAppConfig();
        // Default to a folder in the app root, or use storagePath from config
        this.stagingDir = config.storagePath || join(process.cwd(), 'staging');

        if (!existsSync(this.stagingDir)) {
            await mkdir(this.stagingDir, { recursive: true });
            logger.info(`Created staging directory: ${this.stagingDir}`);
        }

        this.initialized = true;
    }

    private async getStagingPath(): Promise<string> {
        await this.initialize();
        return this.stagingDir!;
    }

    /**
     * Store an API spec for onboarding
     */
    async storeSpec(userId: string, sessionId: string, apiName: string, content: string | Buffer): Promise<string> {
        const stagingDir = await this.getStagingPath();
        const relativePath = join(userId, sessionId, `${apiName}.json`);
        const fullPath = join(stagingDir, relativePath);

        await mkdir(dirname(fullPath), { recursive: true });
        await writeFile(fullPath, content);

        logger.info(`Stored spec to staging: ${relativePath}`);
        return relativePath; // Return relative path for DB storage
    }

    /**
     * Retrieve a stored API spec
     */
    async retrieveSpec(relativePath: string): Promise<string> {
        const stagingDir = await this.getStagingPath();
        const fullPath = join(stagingDir, relativePath);
        if (!existsSync(fullPath)) {
            throw new Error(`Spec not found at path: ${relativePath}`);
        }

        const content = await readFile(fullPath, 'utf-8');
        return content;
    }

    /**
     * Delete a stored API spec
     */
    async deleteSpec(relativePath: string): Promise<void> {
        const stagingDir = await this.getStagingPath();
        const fullPath = join(stagingDir, relativePath);
        if (existsSync(fullPath)) {
            await rm(fullPath);
            logger.info(`Deleted staged spec: ${relativePath}`);
        }
    }

    /**
     * Get the base staging directory
     */
    async getStagingDir(): Promise<string> {
        return await this.getStagingPath();
    }
}

export const onboardingStorageService = new OnboardingStorageService();
