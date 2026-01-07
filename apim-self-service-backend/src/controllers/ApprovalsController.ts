import { FastifyReply, FastifyRequest } from 'fastify';
import { getAllApprovals, updateApproval } from '../services/workflow/ApprovalsService.js';

export class ApprovalsController {

    async getAllApprovals(request: FastifyRequest, reply: FastifyReply) {
        try {
            const approvals = await getAllApprovals();
            return approvals;
        } catch (error) {
            request.log.error({ err: error }, 'Error fetching approvals');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch approvals' });
        }
    }

    async updateApproval(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const { status } = request.body as any;
        try {
            // Note: 'Admin User' is hardcoded in original route. Should likely come from auth context.
            // Preserving original behavior for now.
            const user = (request as any).user?.name || 'Admin User';
            const approval = await updateApproval(id, status, user);
            return approval;
        } catch (error) {
            request.log.error({ err: error }, 'Error processing approval');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to process approval' });
        }
    }
}
