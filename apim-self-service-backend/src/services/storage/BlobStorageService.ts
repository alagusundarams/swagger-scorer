/**
 * @fileoverview Blob Storage Service
 * 
 * Manages file storage for drafts using local filesystem (Day 1 simulation of Azure Blob Storage).
 * In production, this will use Azure Blob Storage with CSI driver.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

export class BlobStorageService {
    private baseDir: string;

    constructor(baseDir?: string) {
        // Default to system temp directory + 'swagger-drafts'
        this.baseDir = baseDir || join(tmpdir(), 'swagger-drafts');
        this.ensureDirectoryExists();
    }

    private async ensureDirectoryExists() {
        try {
            await fs.access(this.baseDir);
            console.log(`[Blob Storage] Using directory: ${this.baseDir}`);
        } catch {
            await fs.mkdir(this.baseDir, { recursive: true });
            console.log(`[Blob Storage] Created directory: ${this.baseDir}`);
        }
    }

    /**
     * Upload a file to blob storage
     * 
     * @param buffer File buffer
     * @param originalName Original filename
     * @param userId User ID for organization
     * @returns Blob URL (file path)
     */
    async upload(buffer: Buffer, originalName: string, userId: string): Promise<string> {
        // Generate unique filename
        const timestamp = Date.now();
        const randomSuffix = randomBytes(8).toString('hex');
        const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_');
        const filename = `${userId}_${timestamp}_${randomSuffix}_${sanitizedName}`;

        const filePath = join(this.baseDir, filename);

        // Write file
        await fs.writeFile(filePath, buffer);

        console.log(`[Blob Storage] Uploaded: ${filename} (${buffer.length} bytes)`);

        // Return "blob URL" (just the filename for local storage)
        return filename;
    }

    /**
     * Download a file from blob storage
     * 
     * @param blobUrl Blob URL (filename)
     * @returns File buffer
     */
    async download(blobUrl: string): Promise<Buffer> {
        const filePath = join(this.baseDir, blobUrl);

        try {
            const buffer = await fs.readFile(filePath);
            console.log(`[Blob Storage] Downloaded: ${blobUrl} (${buffer.length} bytes)`);
            return buffer;
        } catch (error) {
            console.error(`[Blob Storage] Download failed: ${blobUrl}`, error);
            throw new Error(`File not found: ${blobUrl}`);
        }
    }

    /**
     * Delete a file from blob storage
     * 
     * @param blobUrl Blob URL (filename)
     */
    async delete(blobUrl: string): Promise<void> {
        const filePath = join(this.baseDir, blobUrl);

        try {
            await fs.unlink(filePath);
            console.log(`[Blob Storage] Deleted: ${blobUrl}`);
        } catch (error) {
            console.error(`[Blob Storage] Delete failed: ${blobUrl}`, error);
            throw new Error(`Failed to delete file: ${blobUrl}`);
        }
    }

    /**
     * Check if a file exists
     * 
     * @param blobUrl Blob URL (filename)
     * @returns True if exists
     */
    async exists(blobUrl: string): Promise<boolean> {
        const filePath = join(this.baseDir, blobUrl);

        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Get file stats
     * 
     * @param blobUrl Blob URL (filename)
     * @returns File stats (size, etc.)
     */
    async getStats(blobUrl: string): Promise<{ size: number; createdAt: Date }> {
        const filePath = join(this.baseDir, blobUrl);

        try {
            const stats = await fs.stat(filePath);
            return {
                size: stats.size,
                createdAt: stats.birthtime
            };
        } catch (error) {
            throw new Error(`File not found: ${blobUrl}`);
        }
    }

    /**
     * List all files in storage (for debugging/admin)
     */
    async listAll(): Promise<string[]> {
        try {
            const files = await fs.readdir(this.baseDir);
            return files;
        } catch (error) {
            console.error('[Blob Storage] List failed', error);
            return [];
        }
    }

    /**
     * Get base directory path
     */
    getBaseDir(): string {
        return this.baseDir;
    }
}

// Singleton instance
let blobStorageInstance: BlobStorageService | null = null;

export function getBlobStorage(): BlobStorageService {
    if (!blobStorageInstance) {
        blobStorageInstance = new BlobStorageService();
    }
    return blobStorageInstance;
}

export function initBlobStorage(baseDir?: string): BlobStorageService {
    blobStorageInstance = new BlobStorageService(baseDir);
    return blobStorageInstance;
}
