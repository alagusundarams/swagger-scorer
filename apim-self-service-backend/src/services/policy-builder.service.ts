
import { getAllPolicyTemplates, generateXmlFromTemplate } from './policy-templates.service.js';

export interface PolicyStep {
    id: string;
    type: string;
    displayName: string;
    scope: string;
    properties: Record<string, any>;
    xmlSnippet?: string;
    customXmlContent?: string;
    isLocked?: boolean;
}

export interface PolicyFlow {
    inbound: PolicyStep[];
    backend: PolicyStep[];
    outbound: PolicyStep[];
    onError: PolicyStep[];
}

/**
 * Generate full <policies> XML from a flow object
 */
export async function generateFlowXml(flow: PolicyFlow): Promise<string> {
    const allTemplates = await getAllPolicyTemplates();
    const templateMap = new Map(allTemplates.map(t => [t.id, t]));

    const processSection = (steps: PolicyStep[]) => {
        return steps.map(step => {
            if (step.customXmlContent) return step.customXmlContent;
            if (step.xmlSnippet) return step.xmlSnippet;

            const template = templateMap.get(step.type);
            if (template) {
                return generateXmlFromTemplate(template, step.properties);
            }

            // Fallback for unknown types
            return `<!-- Unknown policy type: ${step.type} -->`;
        }).map(xml => `        ${xml.split('\n').join('\n        ')}`).join('\n');
    };

    return `<policies>
    <inbound>
${processSection(flow.inbound || [])}
    </inbound>
    <backend>
${processSection(flow.backend || [])}
    </backend>
    <outbound>
${processSection(flow.outbound || [])}
    </outbound>
    <on-error>
${processSection(flow.onError || [])}
    </on-error>
</policies>`;
}

/**
 * Basic analyzer to turn XML back into a flow (MOCKish for now)
 */
export async function analyzeXmlToFlow(xml: string): Promise<PolicyFlow> {
    // In a real app, use an XML parser.
    // For now, return a basic flow reflecting common patterns or empty.
    const flow: PolicyFlow = { inbound: [], backend: [], outbound: [], onError: [] };

    if (xml.includes('<cors>')) {
        flow.inbound.push({
            id: 'auto-cors',
            type: 'cors',
            displayName: 'CORS',
            scope: 'api',
            properties: { allowedOrigins: ['*'], allowedMethods: 'GET,POST' }
        });
    }

    if (xml.includes('<base />')) {
        flow.inbound.push({
            id: 'auto-base',
            type: 'base',
            displayName: 'Base Policy',
            scope: 'global',
            isLocked: true,
            properties: {},
            xmlSnippet: '<base />'
        });
    }

    return flow;
}
