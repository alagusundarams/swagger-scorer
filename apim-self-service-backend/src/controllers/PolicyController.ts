import { FastifyReply, FastifyRequest } from 'fastify';
import { XmlService } from '../services/policy/XmlService.js';
import { GitService } from '../services/git/GitService.js';
import { getRepoUrlForResource } from '../services/inventory/ProductsService.js';

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

            // 2. Fetch Git Repo URL (Permissions Constraint: Existing Repos Only)
            const repoUrl = await getRepoUrlForResource(resourceId);

            // 3. Commit to Git
            const result = await this.gitService.commitPolicy(resourceId, xml, justification, user, repoUrl || undefined);

            if (result.error === 'NO_REPO_LINKED') {
                return reply.status(403).send({
                    error: 'Permission Denied',
                    details: 'This resource is not linked to a Git repository. You do not have permission to create new repositories.'
                });
            }

            // 4. Return success with commit details
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

    public getPolicy = async (req: FastifyRequest<{ Params: { resourceId: string }; Query: { level?: string } }>, reply: FastifyReply) => {
        const { resourceId } = req.params;
        const { level = 'api' } = req.query as any;

        try {
            // 1. Fetch Git Repo URL
            const repoUrl = await getRepoUrlForResource(resourceId);
            if (!repoUrl) {
                return reply.status(404).send({
                    error: 'Not Found',
                    details: 'No Git repository linked to this resource.'
                });
            }

            // 2. Fetch from Git
            const result = await this.gitService.fetchPolicy(resourceId, repoUrl, level);

            return reply.send({
                resourceId,
                level,
                xml: result.xml,
                filePath: result.filePath
            });
        } catch (error) {
            return reply.status(500).send({
                error: 'Fetch failed',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    };

    /**
     * Generates XML from JSON Flow State (Backend Driven)
     */
    public generateXml = async (req: FastifyRequest<{ Body: { flow: any } }>, reply: FastifyReply) => {
        const { flow } = req.body;

        if (!flow) {
            return reply.status(400).send({ error: 'Flow object is required' });
        }

        try {
            const xml = this.convertFlowToXml(flow);
            return reply.send({ xml });
        } catch (error) {
            return reply.status(500).send({
                error: 'Generation failed',
                details: error instanceof Error ? error.message : String(error)
            });
        }
    };

    private convertFlowToXml(flow: any): string {
        const generateStepXml = (step: any): string => {
            if (step.xmlSnippet) return step.xmlSnippet;

            switch (step.type) {
                case 'rate-limit':
                    const { calls = 10, renewalPeriod = 60, counterKey } = step.properties || {};
                    return `<rate-limit-by-key calls="${calls}" renewal-period="${renewalPeriod}" counter-key="${counterKey || '@(context.Subscription.Id)'}" />`;

                case 'validate-jwt':
                    const { headerName, failedValidationErrorMessage, requireScheme } = step.properties || {};
                    return `<validate-jwt header-name="${headerName || 'Authorization'}" failed-validation-error-message="${failedValidationErrorMessage || 'Unauthorized'}" require-scheme="${requireScheme || 'Bearer'}">
            <openid-config url="https://login.microsoftonline.com/common/v2.0/.well-known/openid-configuration" />
        </validate-jwt>`;

                case 'cors':
                    return `<cors allow-credentials="true">
            <allowed-origins>
                <origin>*</origin>
            </allowed-origins>
            <allowed-methods>
                <method>GET</method>
                <method>POST</method>
            </allowed-methods>
        </cors>`;

                case 'ip-filter':
                    return `<ip-filter action="forbid">
            <address-range from="0.0.0.0" to="255.255.255.255" />
        </ip-filter>`;

                case 'mock-response':
                    return `<mock-response status-code="200" content-type="application/json" />`;

                case 'set-header':
                    return `<set-header name="X-Generated-By" exists-action="override">
            <value>Self-Service-Portal</value>
        </set-header>`;

                case 'custom-xml':
                    return step.customXmlContent || `<!-- Custom XML Block -->`;

                default:
                    return `<!-- Unknown Step Type: ${step.type} -->`;
            }
        };

        return `<!-- Generated by APIM Self-Service Backend -->
<policies>
    <inbound>
        ${(flow.inbound || []).map(generateStepXml).join('\n        ')}
    </inbound>
    <backend>
        ${(flow.backend || []).map(generateStepXml).join('\n        ')}
    </backend>
    <outbound>
        ${(flow.outbound || []).map(generateStepXml).join('\n        ')}
    </outbound>
    <on-error>
        ${(flow.onError || []).map(generateStepXml).join('\n        ')}
    </on-error>
</policies>`;
    }
}
