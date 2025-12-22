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
                warning: (w) => { console.warn('XML Warning:', w); },
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
