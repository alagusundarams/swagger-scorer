import { FastifyReply, FastifyRequest } from 'fastify';
import { auditService } from '../services/core/AuditService.js';

export class AuditController {

    async getAuditLogs(request: FastifyRequest, reply: FastifyReply) {
        const { entityId } = request.query as any;
        try {
            const logs = await auditService.queryLogs({ resourceId: entityId, limit: 100 });
            return logs;
        } catch (error) {
            request.log.error({ err: error }, 'Error fetching audit logs');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch audit logs' });
        }
    }
}
