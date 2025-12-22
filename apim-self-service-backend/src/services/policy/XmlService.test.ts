
import { describe, it, expect } from 'vitest';
import { XmlService } from './XmlService';

describe('XmlService', () => {
    const service = new XmlService();

    it('should validate well-formed XML', () => {
        const validXml = '<policies><inbound><base /></inbound></policies>';
        expect(() => service.validateXml(validXml)).not.toThrow();
    });

    it('should throw on malformed XML', () => {
        const invalidXml = '<policies><inbound><base></inbound></policies>';
        expect(() => service.validateXml(invalidXml)).toThrow();
    });

    it('should parse policy structure and preserve attributes', () => {
        const xml = `
            <policies>
                <inbound>
                    <rate-limit calls="10" renewal-period="60" />
                    <set-header name="X-Test" exists-action="override">
                        <value>test-value</value>
                    </set-header>
                </inbound>
                <backend>
                    <base />
                </backend>
            </policies>
        `;
        const structure = service.parsePolicyStructure(xml);

        expect(structure.inbound).toHaveLength(2);
        expect(structure.inbound[0].type).toBe('rate-limit');
        expect(structure.inbound[0].attributes.calls).toBe('10');
        expect(structure.inbound[0].attributes['renewal-period']).toBe('60');

        expect(structure.inbound[1].type).toBe('set-header');
        expect(structure.inbound[1].attributes.name).toBe('X-Test');
        expect(structure.inbound[1].attributes['exists-action']).toBe('override');
    });

    it('should extract insights from policy XML', () => {
        const xml = `
            <policies>
                <inbound>
                    <set-backend-service base-url="https://api.example.com" />
                    <send-request mode="new" response-variable-name="token" timeout="20" ignore-error="false">
                        <set-url>https://auth.example.com/token</set-url>
                    </send-request>
                </inbound>
            </policies>
        `;
        const insights = service.extractInsights(xml);
        expect(insights).toContain('Backend Routing detected: https://api.example.com');
        expect(insights).toContain('External Callout detected (1 instance(s))');
    });
});
