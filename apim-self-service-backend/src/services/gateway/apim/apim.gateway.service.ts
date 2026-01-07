/**
 * APIM Gateway Service
 * 
 * Parses APIM XML policies to display metadata
 * Does NOT convert to JSON - keeps XML as-is
 */

import { IGatewayService, PolicyDisplayStructure, PolicySectionDisplay, PolicyElementDisplay } from '../../../types/gateway.types.js';
import { DOMParser } from '@xmldom/xmldom';

export class ApimGatewayService implements IGatewayService {
    private parser: DOMParser;

    constructor() {
        this.parser = new DOMParser();
    }

    /**
     * Parse APIM XML to display structure
     * Extracts minimal info for UI rendering
     * Keeps original XML intact
     */
    parseToDisplayStructure(xml: string): PolicyDisplayStructure {
        if (!xml || xml.trim() === '') {
            return {
                gatewayType: 'apim',
                originalPolicy: xml,
                sections: []
            };
        }

        try {
            const doc = this.parser.parseFromString(xml, 'text/xml');
            const sections: PolicySectionDisplay[] = [];

            // APIM sections
            const sectionNames = ['inbound', 'backend', 'outbound', 'on-error'];

            sectionNames.forEach(sectionName => {
                const sectionNode = doc.getElementsByTagName(sectionName)[0];
                if (!sectionNode) return;

                const policies: PolicyElementDisplay[] = [];
                const children = sectionNode.childNodes;

                for (let i = 0; i < children.length; i++) {
                    const node = children[i];
                    if (node.nodeType !== 1) continue;  // Skip non-elements

                    const element = node as Element;
                    const tagName = element.tagName;

                    // Skip <base /> - handled differently
                    if (tagName === 'base') {
                        policies.push({
                            id: `${sectionName}-base`,
                            type: 'base',
                            displayName: 'Base',
                            icon: 'check',
                            attributes: []
                        });
                        continue;
                    }

                    // Extract attributes
                    const attributes: Array<{ key: string; value: string }> = [];
                    if (element.attributes) {
                        for (let j = 0; j < element.attributes.length; j++) {
                            const attr = element.attributes[j];
                            attributes.push({
                                key: attr.name,
                                value: attr.value
                            });
                        }
                    }

                    policies.push({
                        id: `${sectionName}-${tagName}-${i}`,
                        type: tagName,
                        displayName: this.formatPolicyName(tagName),
                        icon: this.getPolicyIcon(tagName),
                        attributes,
                        snippet: element.textContent?.trim().substring(0, 100)
                    });
                }

                sections.push({
                    name: sectionName,
                    policies
                });
            });

            return {
                gatewayType: 'apim',
                originalPolicy: xml,
                sections
            };
        } catch (error) {
            console.error('Failed to parse APIM XML:', error);
            return {
                gatewayType: 'apim',
                originalPolicy: xml,
                sections: []
            };
        }
    }

    validatePolicy(xml: string): { valid: boolean; errors?: string[] } {
        try {
            const doc = this.parser.parseFromString(xml, 'text/xml');
            const parseErrors = doc.getElementsByTagName('parsererror');

            if (parseErrors.length > 0) {
                return {
                    valid: false,
                    errors: ['XML parsing error: Invalid XML structure']
                };
            }

            return { valid: true };
        } catch (error: any) {
            return {
                valid: false,
                errors: [error.message]
            };
        }
    }

    getTemplates(): any[] {
        // Return APIM-specific templates from DB
        // (Already handled by policy-templates.service)
        return [];
    }

    private formatPolicyName(type: string): string {
        return type
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
    }

    private getPolicyIcon(type: string): string {
        const icons: Record<string, string> = {
            'rate-limit': 'zap',
            'cors': 'globe',
            'set-header': 'tool',
            'set-backend-service': 'link',
            'validate-jwt': 'lock',
            'check-header': 'clipboard',
            'rewrite-uri': 'refresh-cw',
            'cache-lookup': 'database',
            'cache-store': 'save',
            'choose': 'git-branch',
            'set-variable': 'code'
        };
        return icons[type] || 'file';
    }
}
