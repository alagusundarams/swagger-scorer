import { FastifyPluginAsync } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

// Configuration
const DRAFTS_DIR = path.join(os.tmpdir(), 'swagger-drafts');
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

/**
 * Initialize drafts directory
 */
const initializeDraftsDir = async () => {
    try {
        await fs.mkdir(DRAFTS_DIR, { recursive: true });
        console.log(`[Drafts] Initialized directory: ${DRAFTS_DIR}`);
    } catch (error) {
        console.error('[Drafts] Failed to create drafts directory:', error);
    }
};

/**
 * Clean up expired drafts (older than 7 days)
 */
const cleanupExpiredDrafts = async () => {
    try {
        const users = await fs.readdir(DRAFTS_DIR);
        const now = Date.now();

        for (const userId of users) {
            const userDir = path.join(DRAFTS_DIR, userId);
            const stats = await fs.stat(userDir);

            if (stats.isDirectory()) {
                const files = await fs.readdir(userDir);

                for (const file of files) {
                    const filePath = path.join(userDir, file);
                    const fileStats = await fs.stat(filePath);

                    // Delete files older than 7 days
                    if (now - fileStats.mtimeMs > DRAFT_TTL_MS) {
                        await fs.unlink(filePath);
                        console.log(`[Drafts] Deleted expired draft: ${filePath}`);
                    }
                }

                // Remove empty user directories
                const remainingFiles = await fs.readdir(userDir);
                if (remainingFiles.length === 0) {
                    await fs.rmdir(userDir);
                    console.log(`[Drafts] Removed empty user directory: ${userDir}`);
                }
            }
        }
    } catch (error) {
        console.error('[Drafts] Error during cleanup:', error);
    }
};

const draftsRoute: FastifyPluginAsync = async (fastify) => {
    // Initialize on startup
    await initializeDraftsDir();

    // Run cleanup on startup and then every hour
    await cleanupExpiredDrafts();
    setInterval(cleanupExpiredDrafts, 60 * 60 * 1000);

    /**
     * Save draft to local filesystem
     * POST /api/v1/drafts
     */
    fastify.post('/drafts', async (request, reply) => {
        const { spec, apiTitle } = request.body as {
            spec: string;
            apiTitle?: string;
        };

        // Extract user ID from Authorization header
        const authHeader = request.headers.authorization;
        const userId = authHeader ? extractUserIdFromToken(authHeader) : 'user-123';

        const draftData = {
            spec,
            apiTitle: apiTitle || 'Untitled Draft',
            updatedAt: new Date().toISOString()
        };

        try {
            // Create user-specific directory
            const userDir = path.join(DRAFTS_DIR, userId);
            await fs.mkdir(userDir, { recursive: true });

            // Save with timestamp
            const filename = `draft-${Date.now()}.json`;
            const filePath = path.join(userDir, filename);

            await fs.writeFile(filePath, JSON.stringify(draftData, null, 2), 'utf-8');

            const expiryDate = new Date(Date.now() + DRAFT_TTL_MS);

            console.log(`[Drafts] Saved draft: ${filePath}`);

            return {
                success: true,
                requestId: filename,
                expiresAt: expiryDate.toISOString(),
                path: filePath
            };
        } catch (error) {
            console.error('[Drafts] Error saving draft:', error);
            return reply.code(500).send({
                error: 'Failed to save draft',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });

    /**
     * Get latest draft from local filesystem
     * GET /api/v1/drafts/latest
     */
    fastify.get('/drafts/latest', async (request, reply) => {
        const authHeader = request.headers.authorization;
        const userId = authHeader ? extractUserIdFromToken(authHeader) : 'user-123';

        try {
            const userDir = path.join(DRAFTS_DIR, userId);

            // Check if user directory exists
            try {
                await fs.access(userDir);
            } catch {
                return reply.code(404).send({
                    error: 'No drafts found'
                });
            }

            // Get all draft files
            const files = await fs.readdir(userDir);
            const draftFiles = files.filter(f => f.startsWith('draft-') && f.endsWith('.json'));

            if (draftFiles.length === 0) {
                return reply.code(404).send({
                    error: 'No drafts found'
                });
            }

            // Find the most recent file
            let latestFile = draftFiles[0];
            let latestMtime = 0;

            for (const file of draftFiles) {
                const filePath = path.join(userDir, file);
                const stats = await fs.stat(filePath);
                if (stats.mtimeMs > latestMtime) {
                    latestMtime = stats.mtimeMs;
                    latestFile = file;
                }
            }

            // Read the latest draft
            const latestPath = path.join(userDir, latestFile);
            const content = await fs.readFile(latestPath, 'utf-8');
            const draftData = JSON.parse(content);

            console.log(`[Drafts] Retrieved latest draft: ${latestPath}`);

            return draftData;
        } catch (error) {
            console.error('[Drafts] Error retrieving draft:', error);
            return reply.code(500).send({
                error: 'Failed to retrieve draft',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    });
};

/**
 * Extract user ID from JWT token
 * TODO: Integrate with actual auth implementation
 */
function extractUserIdFromToken(_authHeader: string): string {
    // TODO: Remove "Bearer " prefix, decode and validate JWT
    // For now, returning a mock user ID
    return 'user-123';
}

export default draftsRoute;
