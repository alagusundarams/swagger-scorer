import { FastifyReply, FastifyRequest } from 'fastify';
import { getAllTeams, createTeam, updateTeam } from '../services/identity/TeamsService.js';

export class TeamsController {

    async getAllTeams(request: FastifyRequest, reply: FastifyReply) {
        try {
            const teams = await getAllTeams();
            return teams;
        } catch (error) {
            request.log.error({ err: error }, 'Error fetching teams');
            return reply.status(500).send({ error: 'Internal Server Error', message: 'Failed to fetch teams' });
        }
    }

    async createTeam(request: FastifyRequest, reply: FastifyReply) {
        try {
            const team = await createTeam(request.body as any);
            return team;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error creating team');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }

    async updateTeam(request: FastifyRequest, reply: FastifyReply) {
        const { id } = request.params as any;
        try {
            const team = await updateTeam(id, request.body as any);
            return team;
        } catch (error: any) {
            request.log.error({ err: error }, 'Error updating team');
            return reply.status(500).send({ error: 'Internal Server Error', message: error.message });
        }
    }
}
