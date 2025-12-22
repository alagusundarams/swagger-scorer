/**
 * @fileoverview XML Parser for the Policy Studio (The "Lens").
 * 
 * Converts legacy Azure APIM Policy XML -> Visual Policy Flow JSON.
 * 
 * STRATEGY: "Safe Round-Trip"
 * 1. Parse standard policies we understand (`rate-limit`, `validate-jwt`) into visual blocks.
 * 2. Everything else? Wrap it in a `custom-xml` block.
 *    This ensures we never "break" legacy policies, even if we don't fully support their UI.
 */

import { PolicyFlow, PolicyStep } from '../types/policyTypes';

export const parsePolicyXml = (xmlString: string | null | undefined): PolicyFlow => {
    // Default Empty Flow
    const flow: PolicyFlow = {
        inbound: [],
        backend: [],
        outbound: [],
        onError: []
    };

    if (!xmlString) return flow;

    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "text/xml");

        // Helper to parse a section (e.g. <inbound>)
        const parseSection = (sectionName: string): PolicyStep[] => {
            const sectionNode = xmlDoc.getElementsByTagName(sectionName)[0];
            if (!sectionNode) return [];

            const steps: PolicyStep[] = [];

            // Iterate over direct children
            Array.from(sectionNode.children).forEach((node) => {
                const tagName = node.tagName;

                // 1. RATE LIMIT / QUOTA
                if (tagName === 'rate-limit' || tagName === 'rate-limit-by-key') {
                    steps.push({
                        id: crypto.randomUUID(),
                        type: 'rate-limit',
                        displayName: 'Rate Limit',
                        scope: 'api',
                        isLocked: false,
                        properties: {
                            calls: parseInt(node.getAttribute('calls') || '10'),
                            period: parseInt(node.getAttribute('renewal-period') || '60'),
                            keyInfo: tagName === 'rate-limit-by-key' ? (node.getAttribute('counter-key') || '') : undefined
                        }
                    });
                    return;
                }

                // 2. VALIDATE JWT
                if (tagName === 'validate-jwt') {
                    steps.push({
                        id: crypto.randomUUID(),
                        type: 'validate-jwt',
                        displayName: 'Validate JWT',
                        scope: 'api',
                        isLocked: false,
                        properties: {
                            headerName: node.getAttribute('header-name') || 'Authorization',
                            failedValidationErrorMessage: node.getAttribute('failed-validation-error-message') || 'Unauthorized'
                        }
                    });
                    return;
                }

                // 3. BASE (Inheritance)
                if (tagName === 'base') {
                    // We don't visualize <base/> as a block, usually it's implicit.
                    // But if we want to show it, we could. For now, we skip or add a specific 'base' block.
                    // Let's preserve it as a Custom Block to be safe, or just ignore if our UI assumes base is always there?
                    // Safe approach: Custom Block
                    steps.push({
                        id: crypto.randomUUID(),
                        type: 'custom-xml',
                        displayName: 'Inherit Base',
                        scope: 'global',
                        isLocked: true,
                        properties: {
                            xmlContent: '<base />'
                        }
                    });
                    return;
                }

                // 4. SMART CLASSIFIER (Legacy/Complex Logic Detection)
                // We serialize the node back to string for safe storage
                const serializer = new XMLSerializer();
                const rawXml = serializer.serializeToString(node);

                let friendlyName = `Raw: <${tagName}>`;
                let iconOverride = '🧩'; // Default Puzzle Piece

                let details = ''; // Extracted summary for the UI

                // Heuristics for "Smart" naming
                if (tagName === 'choose' || tagName === 'when' || tagName === 'otherwise') {
                    friendlyName = 'Complex Logic (C#)';
                    iconOverride = '🔀';
                } else if (tagName === 'set-variable') {
                    friendlyName = 'Set Context Variable';
                    iconOverride = '📦';
                    details = `Name: ${node.getAttribute('name')}`;
                } else if (tagName === 'set-header') {
                    const hName = node.getAttribute('name');
                    friendlyName = hName === 'Authorization' ? 'Auth Token Override' : 'Set Header';
                    iconOverride = hName === 'Authorization' ? '🔑' : '🔧';
                    details = `Header: ${hName}`;
                } else if (tagName === 'send-request' || tagName === 'send-one-way-request') {
                    friendlyName = 'External Callout';
                    iconOverride = '📡';
                    // Deep inspect for destination
                    const urlNode = node.getElementsByTagName('set-url')[0];
                    if (urlNode) details = `Target: ${urlNode.textContent}`;
                } else if (tagName === 'rewrite-uri') {
                    friendlyName = 'Rewrite Path';
                    iconOverride = '🔂';
                    details = `Template: ${node.getAttribute('template')}`;
                } else if (tagName === 'set-backend-service') {
                    friendlyName = 'Backend Routing';
                    iconOverride = '🚢';
                    details = `Base URL: ${node.getAttribute('base-url')}`;
                } else if (tagName === 'ip-filter' || tagName === 'cors') {
                    friendlyName = 'Traffic Security';
                    iconOverride = '🛡️';
                }

                steps.push({
                    id: crypto.randomUUID(),
                    type: 'custom-xml',
                    displayName: friendlyName,
                    scope: 'api',
                    isLocked: false,
                    properties: {
                        xmlContent: rawXml,
                        icon: iconOverride,
                        details: details // Passing extraction to UI
                    }
                });
            });

            return steps;
        };

        flow.inbound = parseSection('inbound');
        flow.backend = parseSection('backend');
        flow.outbound = parseSection('outbound');
        flow.onError = parseSection('on-error');

    } catch (e) {
        console.error("Failed to parse Legacy XML:", e);
        // Fallback: Return empty or maybe a single giant Custom Block with the error?
    }

    return flow;
};
