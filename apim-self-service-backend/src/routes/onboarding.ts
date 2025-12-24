import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { onboardingStorageService } from '../services/OnboardingStorageService.js';
import { parseOpenAPI, detectOpenAPIVersion } from '../services/parser.js';
import { createSpectral, analyzeWithSpectral } from '../services/spectral.js';
import { calculateScore } from '../services/scorer.js';
import { query } from '../services/db.js';
import { v4 as uuidv4 } from 'uuid';
import { ScoringConfig } from '../types/index.js';

/**
 * Onboarding Routes
 * 
 * Handles the staging and reconciliation of new API onboarding requests.
 * Uses a "Minimal DB" approach: metadata in Postgres, blobs on CSI-backed file system.
 */
export default async function onboardingRoutes(fastify: FastifyInstance, config: ScoringConfig) {

    /**
     * POST /api/v1/onboarding/stage
     * Upload an API spec to the staging area (CSI-backed file system)
     */
    fastify.post('/stage', async (request: FastifyRequest, reply: FastifyReply) => {
        const data = await request.file();
        if (!data) {
            return reply.status(400).send({ error: 'No file uploaded' });
        }

        const buffer = await data.toBuffer();
        const apiName = (request.query as any).apiName || 'UnnamedAPI';
        const userId = (request.query as any).userId || 'anonymous';
        const sessionId = (request.query as any).sessionId || uuidv4();

        try {
            // 1. Store in Staging Area (Local File System / CSI Mount)
            const relativePath = await onboardingStorageService.storeSpec(userId, sessionId, apiName, buffer);

            // 2. Create minimal record in DB for tracking
            const stagingId = uuidv4();
            await query(
                `INSERT INTO api_onboarding_staging (id, user_id, session_id, api_name, blob_path, status)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [stagingId, userId, sessionId, apiName, relativePath, 'STAGED']
            );

            return {
                id: stagingId,
                apiName,
                storagePath: relativePath,
                status: 'STAGED'
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Failed to stage API spec' });
        }
    });

    /**
     * POST /api/v1/onboarding/staging/:id/analyze
     * Analyze a staged API spec using spectral
     */
    fastify.post('/staging/:id/analyze', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };

        try {
            // 1. Get metadata from DB
            const result = await query('SELECT * FROM api_onboarding_staging WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                return reply.status(404).send({ error: 'Staging record not found' });
            }

            const stagingRecord = result.rows[0];

            // 2. Retrieve content from Staging Area
            const content = await onboardingStorageService.retrieveSpec(stagingRecord.blob_path);

            // 3. Run Analysis (Source of Truth Reconciliation)
            const format = stagingRecord.blob_path.endsWith('.json') ? 'json' : 'yaml';

            // Validate structure and detect version
            const spec = await parseOpenAPI(content, format as any);
            const specVersion = detectOpenAPIVersion(spec);

            // Run Spectral
            const spectral = await createSpectral();
            const results = await analyzeWithSpectral(spec, spectral, content);
            const analysisResult = calculateScore(results, config, specVersion);

            // 4. Update minimal DB metadata
            const metadata = {
                ...stagingRecord.metadata,
                analysis: {
                    score: analysisResult.score,
                    issueCount: results.length,
                    timestamp: new Date().toISOString()
                }
            };

            await query(
                'UPDATE api_onboarding_staging SET status = $1, metadata = $2, updated_at = NOW() WHERE id = $3',
                ['ANALYZED', JSON.stringify(metadata), id]
            );

            return {
                id,
                status: 'ANALYZED',
                score: analysisResult.score,
                issueCount: results.length,
                results: results.slice(0, 10) // Top 10 issues
            };
        } catch (error) {
            fastify.log.error(error);
            return reply.status(500).send({ error: 'Failed to analyze staged API' });
        }
    });

    /**
     * GET /api/v1/onboarding/staging/:id
     * Fetch staging record with minimal data
     */
    fastify.get('/staging/:id', async (request: FastifyRequest, reply: FastifyReply) => {
        const { id } = request.params as { id: string };
        const result = await query('SELECT * FROM api_onboarding_staging WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return reply.status(404).send({ error: 'Staging record not found' });
        }

        return result.rows[0];
    });
}
