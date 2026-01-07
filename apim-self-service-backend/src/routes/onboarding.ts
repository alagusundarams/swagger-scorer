import { FastifyInstance } from 'fastify';
import { ScoringConfig } from '../types/index.js';


/**
 * Onboarding Routes
 * 
 * Handles the staging and reconciliation of new API onboarding requests.
 * Uses a "Minimal DB" approach: metadata in Postgres, blobs on CSI-backed file system.
 */
export default async function onboardingRoutes(fastify: FastifyInstance, config: ScoringConfig) {
    const { onboardingController: controller } = fastify.container;
    controller.setConfig(config);

    // POST /api/v1/onboarding/stage
    fastify.post('/stage', controller.stageApi.bind(controller));

    // POST /api/v1/onboarding/staging/:id/analyze
    fastify.post('/staging/:id/analyze', controller.analyzeApi.bind(controller));

    // POST /api/v1/onboarding/staging/:id/fulfill
    fastify.post('/staging/:id/fulfill', controller.fulfillApi.bind(controller));

    // GET /api/v1/onboarding/staging/:id
    fastify.get('/staging/:id', controller.getStagingRecord.bind(controller));
}
