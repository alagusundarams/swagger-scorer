/**
 * @fileoverview XML Policy Service
 * 
 * Manages XML parsing and validation for the Backend.
 * Uses @xmldom/xmldom because strict DOMParser is not available in Node.js.
 * 
 * SCOPE:
 * - Validating XML syntax (no unclosed tags)
 * - Extracting Policy structure for analysis (Backend equivalent of the Lens)
 */

import { DOMParser } from '@xmldom/xmldom';

export class XmlService {
    /**
     * strict: Validates if the XML string is well-formed.
     * Returns true if valid, throws Error if invalid.
     */
    validateXml(xmlString: string): boolean {
        const parser = new DOMParser({
            errorHandler: {
                warning: (w) => { throw new Error(`XML Warning: ${w}`); },
                error: (e) => { throw new Error(`XML Error: ${e}`); },
                fatalError: (e) => { throw new Error(`XML Fatal Error: ${e}`); }
            }
        });

        try {
            parser.parseFromString(xmlString, 'text/xml');
            return true;
        } catch (e) {
            throw new Error(`Invalid XML: ${e instanceof Error ? e.message : String(e)}`);
        }
    }

    /**
     * Parses Policy XML into a structured JSON format for the Frontend Visualizer.
     * Replaces the legacy client-side regex parser.
     */
    parsePolicyStructure(xmlString: string): any {
        const parser = new DOMParser();
        let doc: Document;

        try {
            doc = parser.parseFromString(xmlString, 'text/xml');
        } catch (e) {
            console.error('XML Parse Error:', e);
            return { inbound: [], backend: [], outbound: [], onError: [] };
        }

        return {
            inbound: this.parseSection(doc, 'inbound'),
            backend: this.parseSection(doc, 'backend'),
            outbound: this.parseSection(doc, 'outbound'),
            onError: this.parseSection(doc, 'on-error')
        };
    }

    private parseSection(doc: Document, sectionName: string): any[] {
        const section = doc.getElementsByTagName(sectionName)[0];
        if (!section) return [];

        const nodes: any[] = [];
        // Iterate over direct children only
        // Note: xmldom's childNodes includes text nodes (whitespace), so we filter
        for (let i = 0; i < section.childNodes.length; i++) {
            const node = section.childNodes[i] as Element;
            if (node.nodeType === 1) { // Element Node
                nodes.push(this.mapNodeToPolicy(node));
            }
        }
        return nodes;
    }

    private mapNodeToPolicy(node: Element): any {
        const type = node.tagName;
        const attributes: Record<string, string> = {};

        if (node.attributes) {
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                attributes[attr.name] = attr.value;
            }
        }

        // Auto-generate description based on known types (matching frontend logic)
        let description = type;
        if (type === 'rate-limit') {
            description = `Limit to ${attributes['calls'] || '?'} calls per ${attributes['renewal-period'] || '?'}s`;
        } else if (type === 'set-header') {
            description = `Set header '${attributes['name']}'`;
        } else if (type === 'validate-jwt') {
            description = 'Validate JWT Token';
        } else if (type === 'mock-response') {
            description = 'Mock Response';
        }

        // Recursive parsing for container policies (like choose/when)
        // For MVP parity, we just check if it has children that are elements
        const children: any[] = [];
        if (node.childNodes) {
            for (let i = 0; i < node.childNodes.length; i++) {
                const child = node.childNodes[i] as Element;
                if (child.nodeType === 1) {
                    children.push(this.mapNodeToPolicy(child));
                }
            }
        }

        return {
            type,
            description,
            attributes,
            children: children.length > 0 ? children : undefined
        };
    }

    /**
     * Extracts deep insights from the XML (mirroring the Frontend Lens).
     * Useful for auditing policies without rendering them.
     */
    extractInsights(xmlString: string): string[] {
        const insights: string[] = [];
        const parser = new DOMParser();
        const doc = parser.parseFromString(xmlString, 'text/xml');

        // logic to find <set-backend-service> etc.
        const backendNodes = doc.getElementsByTagName('set-backend-service');
        if (backendNodes.length > 0) {
            insights.push(`Backend Routing detected: ${backendNodes[0].getAttribute('base-url') || 'Unknown URL'}`);
        }

        const sendRequestNodes = doc.getElementsByTagName('send-request');
        if (sendRequestNodes.length > 0) {
            insights.push(`External Callout detected (${sendRequestNodes.length} instance(s))`);
        }

        return insights;
    }
}
