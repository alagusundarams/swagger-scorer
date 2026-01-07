import { FastifyReply, FastifyRequest } from 'fastify';
import { query } from '../services/core/db.js';

export class DashboardController {

    async getDashboardStats(request: FastifyRequest, reply: FastifyReply) {
        try {
            // Aggregated stats for the Admin Dashboard
            // Parallel queries for performance
            const [products, apis, teams, pendingSubs] = await Promise.all([
                query('SELECT COUNT(*) as count FROM products'),
                query('SELECT COUNT(*) as count FROM apis'),
                query('SELECT COUNT(*) as count FROM teams'),
                query("SELECT COUNT(*) as count FROM subscriptions WHERE state = 'pending'")
            ]);

            const stats = {
                totalProducts: parseInt(products.rows[0].count),
                totalApis: parseInt(apis.rows[0].count),
                totalTeams: parseInt(teams.rows[0].count),
                pendingSubscriptions: parseInt(pendingSubs.rows[0].count)
            };

            return stats;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error fetching dashboard stats');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
