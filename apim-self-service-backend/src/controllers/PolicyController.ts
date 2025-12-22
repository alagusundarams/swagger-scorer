import { FastifyReply, FastifyRequest } from 'fastify';
import { XmlService } from '../services/policy/XmlService.js';
import { GitService } from '../services/git/GitService.js';

export class PolicyController {
    private xmlService: XmlService;
    private gitService: GitService;

    constructor() {
        this.xmlService = new XmlService();
        this.gitService = new GitService();
    }

    public parsePolicy = async (req: FastifyRequest<{ Body: { xml: string } }>, reply: FastifyReply) => {
        const { xml } = req.body;

        if (!xml) {
            return reply.status(400).send({ error: 'XML content is required' });
        }

        try {
            // 1. Validate first
            this.xmlService.validateXml(xml);

            // 2. Parse for structure
            const structure = this.xmlService.parsePolicyStructure(xml);

            return reply.send(structure);
        } catch (error) {
            return reply.status(400).send({
                error: 'Invalid XML',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    };

    public deployPolicy = async (
        req: FastifyRequest<{ Body: { xml: string; resourceId: string; justification: string; user?: string } }>,
        reply: FastifyReply
    ) => {
        const { xml, resourceId, justification, user = 'Portal Admin' } = req.body;

        if (!xml || !resourceId || !justification) {
            return reply.status(400).send({ error: 'xml, resourceId, and justification are required' });
        }

        try {
            // 1. Validate XML
            this.xmlService.validateXml(xml);

            // 2. Commit to Git (Simulated)
            const result = await this.gitService.commitPolicy(resourceId, xml, justification, user);

            // 3. Return success with commit details
            return reply.send({
                message: 'Policy deployed successfully via GitOps',
                ...result
            });
        } catch (error) {
            return reply.status(400).send({
                error: 'Deployment failed',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    };
}
