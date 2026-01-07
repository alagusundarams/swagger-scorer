
import { getAllPolicyTemplates, generateXmlFromTemplate } from './PolicyTemplatesService.js';

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

/**
 * Smart Decomposition: Extracts hardcoded values and replaces them with tokens
 */
export function decomposePolicyXml(xml: string): { cleanedXml: string, variables: { name: string, value: string }[] } {
    const variables: { name: string, value: string }[] = [];
    let cleanedXml = xml;

    // 1. Detect Backend URLs
    const backendRegex = /<set-backend-service\s+base-url="([^"{}]+)"\s*\/>/g;
    let match;
    while ((match = backendRegex.exec(xml)) !== null) {
        const val = match[1];
        const varName = `ejected-backend-${val.replace(/[^a-z0-9]/gi, '-').toLowerCase().slice(-10)}`;
        variables.push({ name: varName, value: val });
        cleanedXml = cleanedXml.replace(val, `{{${varName}}}`);
    }

    // 2. Detect hardcoded URLs in set-variable or headers (Simplified)
    const urlRegex = /https?:\/\/[a-z0-9.-]+\.[a-z]{2,5}[^\s"<]*/gi;
    const urls = Array.from(new Set(xml.match(urlRegex) || []));
    urls.forEach((url, i) => {
        // Skip if already tokenized
        if (xml.includes(`{{`)) return;

        const varName = `ejected-url-${i}`;
        variables.push({ name: varName, value: url });
        cleanedXml = cleanedXml.replace(new RegExp(url, 'g'), `{{${varName}}}`);
    });

    return { cleanedXml, variables };
}
