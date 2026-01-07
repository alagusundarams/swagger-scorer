/**
 * @fileoverview Validation Routes
 * 
 * Real-time validation endpoints for duplicate detection during onboarding.
 * Checks for duplicates per environment to prevent conflicts.
 */

import { FastifyInstance, FastifyPluginOptions } from 'fastify';
import { ValidationController } from '../controllers/ValidationController.js';

const controller = new ValidationController();

export async function validationRoutes(fastify: FastifyInstance, _options: FastifyPluginOptions) {

    /**
     * POST /api/v1/validate/api-path
     */
    fastify.post('/api-path', controller.validateApiPath.bind(controller));

    /**
     * POST /api/v1/validate/product-name
     */
    fastify.post('/product-name', controller.validateProductName.bind(controller));

    /**
     * POST /api/v1/validate/named-value-key
     */
    fastify.post('/named-value-key', controller.validateNamedValueKey.bind(controller));

    /**
     * POST /api/v1/validate/backend-id
     */
    fastify.post('/backend-id', controller.validateBackendId.bind(controller));

    /**
     * POST /api/v1/validate/subscription
     * (was subscription-name in original file comment but route was /subscription)
     */
    fastify.post('/subscription', controller.validateSubscription.bind(controller));

    /**
     * POST /api/v1/validate/batch
     */
    fastify.post('/batch', controller.validateBatch.bind(controller));

}
