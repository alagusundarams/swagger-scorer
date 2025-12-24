import { FastifyInstance } from 'fastify';

export async function mockRoutes(fastify: FastifyInstance) {
    // Mocks have been migrated to the Real DB.
    // This file is kept as a placeholder if we need strictly isolated mocks in the future.
    fastify.log.info('Mock Routes initialized (empty).');
}
