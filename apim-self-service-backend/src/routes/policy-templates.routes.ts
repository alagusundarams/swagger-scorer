/**
 * @fileoverview Policy Templates Routes
 * 
 * API endpoints for backend-driven policy templates
 */

import { FastifyPluginAsync } from 'fastify';
import {
    getAllPolicyTemplates,
    getTemplatesBySection,
    getPolicyTemplate,
    generateXmlFromTemplate,
    upsertPolicyTemplate
} from '../services/policy-templates.service.js';

const policyTemplatesRoutes: FastifyPluginAsync = async (fastify) => {
    /**
     * GET /api/v1/policy/templates
     * Get all active policy templates
     */
    fastify.get('/policy/templates', async (_request, reply) => {
        try {
            const templates = await getAllPolicyTemplates();
            return { success: true, count: templates.length, templates };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get policy templates');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy/templates?section=inbound
     * Get templates for a specific section
     */
    fastify.get('/policy/templates/by-section', async (request, reply) => {
        const { section } = request.query as { section?: string };

        if (!section) {
            return reply.code(400).send({ error: 'section query parameter required' });
        }

        try {
            const templates = await getTemplatesBySection(section);
            return { success: true, count: templates.length, templates };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get templates by section');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * GET /api/v1/policy/templates/:id
     * Get a specific template
     */
    fastify.get('/policy/templates/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        try {
            const template = await getPolicyTemplate(id);

            if (!template) {
                return reply.code(404).send({ error: 'Template not found' });
            }

            return { success: true, template };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to get template');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/policy/templates/generate
     * Generate XML from template and values
     */
    fastify.post('/policy/templates/generate', async (request, reply) => {
        const { templateId, values } = request.body as { templateId: string; values: Record<string, any> };

        if (!templateId || !values) {
            return reply.code(400).send({ error: 'templateId and values required' });
        }

        try {
            const template = await getPolicyTemplate(templateId);

            if (!template) {
                return reply.code(404).send({ error: 'Template not found' });
            }

            const xml = generateXmlFromTemplate(template, values);
            return { success: true, xml };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to generate XML');
            return reply.code(500).send({ error: error.message });
        }
    });

    /**
     * POST /api/v1/policy/templates
     * Create or update a template (admin only)
     */
    fastify.post('/policy/templates', async (request, reply) => {
        // TODO: Check admin role
        const { id, name, description, category, section, templateSchema, displayOrder } = request.body as any;

        if (!id || !name || !category || !section || !templateSchema) {
            return reply.code(400).send({ error: 'Missing required fields' });
        }

        try {
            const template = await upsertPolicyTemplate({
                id,
                name,
                description,
                category,
                section,
                templateSchema,
                displayOrder
            });

            return { success: true, template };
        } catch (error: any) {
            fastify.log.error({ err: error }, 'Failed to upsert template');
            return reply.code(500).send({ error: error.message });
        }
    });
};

export default policyTemplatesRoutes;
