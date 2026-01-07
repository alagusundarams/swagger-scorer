import { FastifyReply, FastifyRequest } from 'fastify';
import { NamedValuesRepository } from '../repositories/named-values.repo.js';
import { getOrphanBackends, assignBackend } from '../services/inventory/BackendsService.js';

const namedValuesRepo = new NamedValuesRepository();

export class OrphansController {

    // ==========================================
    // NAMED VALUES ORPHANS
    // ==========================================

    async getOrphanNamedValues(request: FastifyRequest, reply: FastifyReply) {
        const { environment } = request.query as { environment: string };
        if (!environment) {
            return reply.status(400).send({ error: 'environment query param required' });
        }

        try {
            const result = await namedValuesRepo.getOrphanNamedValues(environment);

            // Map to CamelCase for Frontend
            const mappedOrphans = result.rows.map(row => ({
                id: row.id,
                systemName: row.system_name,
                displayName: row.display_name,
                environment: row.environment,
                value: row.value,
                productId: row.product_id,
                scopeId: row.scope_id,
                isSecret: row.is_secret,
                updatedAt: row.updated_at
            }));

            return { orphans: mappedOrphans };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching orphan named values');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    async adoptNamedValue(request: FastifyRequest, reply: FastifyReply) {
        const { id, environment, productId } = request.body as any;
        if (!id || !environment || !productId) {
            return reply.status(400).send({ error: 'id, environment, and productId are required' });
        }

        try {
            // 1. Update the named value to set the product_id
            const result = await namedValuesRepo.adoptNamedValue(id, productId);
            if (result.rowCount === 0) {
                return reply.status(404).send({ error: 'Named Value not found' });
            }

            const nv = result.rows[0];

            // 2. Link in junction table as OWNER
            await namedValuesRepo.linkProductToNamedValue(productId, id, { isOwner: true, canModify: true });

            return { value: nv };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adopting named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    // ==========================================
    // BACKENDS ORPHANS
    // ==========================================

    async getOrphanBackends(request: FastifyRequest, reply: FastifyReply) {
        const { environment } = request.query as { environment: string };
        if (!environment) {
            return reply.status(400).send({ error: 'environment query param required' });
        }

        try {
            const orphans = await getOrphanBackends(environment);
            return { orphans };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching orphan backends');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    async adoptBackend(request: FastifyRequest, reply: FastifyReply) {
        const body = request.body as any;
        // Body includes: id, environment, productId, apiId, scope

        try {
            const backend = await assignBackend(body.id, body.environment, body);
            if (!backend) {
                return reply.status(404).send({ error: 'Backend not found' });
            }
            return { backend };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adopting backend');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
