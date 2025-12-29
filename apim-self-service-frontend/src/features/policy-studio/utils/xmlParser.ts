/**
 * xmlParser.ts
 * 
 * Utility to parse Azure API Management (APIM) Policy XML into a structured JSON format
 * suitable for visualization in the Policy Studio.
 * 
 * Features:
 * - Extracts Inbound, Backend, Outbound, On-Error sections.
 * - Identifies key policies: rate-limit, validate-jwt, set-header, mock-response.
 * - Robust against malformed XML using widespread regex patterns (for client-side lightness).
 */

export interface PolicyNode {
    type: string;
    description: string;
    attributes: Record<string, string>;
    children?: PolicyNode[];
}

export interface PolicyStructure {
    inbound: PolicyNode[];
    backend: PolicyNode[];
    outbound: PolicyNode[];
    onError: PolicyNode[];
}

const parseSection = (xml: string, sectionName: string): PolicyNode[] => {
    // Regex to extract content between <sectionName>...</sectionName>
    const sectionRegex = new RegExp(`<${sectionName}>([\\s\\S]*?)<\\/${sectionName}>`, 'i');
    const match = xml.match(sectionRegex);

    if (!match || !match[1]) return [];

    const content = match[1];
    const nodes: PolicyNode[] = [];

    // Regex to find individual policy tags (simplified for demo/MVP)
    // Matches <policy-name attr="val" /> OR <policy-name>...</policy-name>
    const policyRegex = /<([\w-]+)([^>]*)>(?:([\s\S]*?)<\/\1>)?/g;

    let policyMatch;
    while ((policyMatch = policyRegex.exec(content)) !== null) {
        const [, tagName, attrsString, innerContent] = policyMatch;

        // Parse attributes
        const attributes: Record<string, string> = {};
        const attrRegex = /([\w-]+)="([^"]*)"/g;
        let attrMatch;
        while ((attrMatch = attrRegex.exec(attrsString)) !== null) {
            attributes[attrMatch[1]] = attrMatch[2];
        }

        // Determine description based on policy type
        let description = tagName;

        if (tagName === 'rate-limit') {
            description = `Limit to ${attributes['calls']} calls per ${attributes['renewal-period']}s`;
        } else if (tagName === 'set-header') {
            description = `Set header '${attributes['name']}'`;
        } else if (tagName === 'validate-jwt') {
            description = 'Validate JWT Token';
        } else if (tagName === 'mock-response') {
            description = 'Mock Response';
        }

        nodes.push({
            type: tagName,
            description,
            attributes,
            // Recursive parsing for complex policies like choose/when could go here
            // For now, we treat inner content as opaque unless we need specific deep parsing
            children: innerContent ? parseSection(`<wrapper>${innerContent}</wrapper>`, 'wrapper') : undefined
        });
    }

    return nodes;
};

export const parsePolicyXml = (xml: string): PolicyStructure => {
    if (!xml) {
        return { inbound: [], backend: [], outbound: [], onError: [] };
    }

    return {
        inbound: parseSection(xml, 'inbound'),
        backend: parseSection(xml, 'backend'),
        outbound: parseSection(xml, 'outbound'),
        onError: parseSection(xml, 'on-error'),
    };
};
