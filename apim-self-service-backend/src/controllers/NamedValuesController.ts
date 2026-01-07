import { FastifyReply, FastifyRequest } from 'fastify';
import {
    getNamedValues,
    createNamedValue,
    deleteNamedValue,
    checkNamedValueDuplicate
} from '../services/inventory/NamedValuesService.js';

export class NamedValuesController {

    /**
     * Get Named Values for a Product
     */
    async getNamedValues(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const values = await getNamedValues(id);
            return values;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching named values');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch named values' });
        }
    }

    /**
     * Create/Add a Named Value to a Product
     */
    async createNamedValue(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        const body = request.body as any;
        try {
            const value = await createNamedValue(id, body);
            return value;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error adding named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Check for duplicate Named Value system name
     */
    async checkDuplicate(request: FastifyRequest, reply: FastifyReply) {
        const { systemName, environment } = request.body as any;
        try {
            const result = await checkNamedValueDuplicate(systemName, environment);
            return result;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error checking duplicate');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    /**
     * Delete/Unlink a Named Value
     */
    async deleteNamedValue(request: FastifyRequest, reply: FastifyReply) {
        const { id, valueId } = request.params as any;
        try {
            await deleteNamedValue(id, valueId);
            return { success: true };
        } catch (error: any) {
            request.log.error({ err: error }, 'Error deleting named value');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
