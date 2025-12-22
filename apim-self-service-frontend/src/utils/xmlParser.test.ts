import { describe, it, expect } from 'vitest';
import { parsePolicyXml } from './xmlParser';

describe('xmlParser', () => {
    const mockXml = `
        <policies>
            <inbound>
                <base />
                <rate-limit calls="50" renewal-period="60" />
                <validate-jwt header-name="Authorization">
                    <openid-config url="https://login.microsoftonline.com/common/.well-known/openid-configuration" />
                </validate-jwt>
            </inbound>
            <backend>
                <base />
            </backend>
            <outbound>
                <set-header name="X-Powered-By" exists-action="delete" />
            </outbound>
            <on-error />
        </policies>
    `;

    it('should parse inbound policies correctly', () => {
        const result = parsePolicyXml(mockXml);
        expect(result.inbound).toHaveLength(3);

        const rateLimit = result.inbound.find(n => n.type === 'rate-limit');
        expect(rateLimit).toBeDefined();
        expect(rateLimit?.attributes['calls']).toBe('50');
        expect(rateLimit?.description).toContain('Limit to 50 calls');
    });

    it('should parse nested children in validate-jwt', () => {
        const result = parsePolicyXml(mockXml);
        const jwt = result.inbound.find(n => n.type === 'validate-jwt');
        expect(jwt).toBeDefined();
        expect(jwt?.children).toHaveLength(1);
        expect(jwt?.children![0].type).toBe('openid-config');
    });

    it('should parse outbound policies correctly', () => {
        const result = parsePolicyXml(mockXml);
        expect(result.outbound).toHaveLength(1);
        expect(result.outbound[0].type).toBe('set-header');
        expect(result.outbound[0].attributes['name']).toBe('X-Powered-By');
    });

    it('should handle empty sections safely', () => {
        const result = parsePolicyXml('<policies><inbound></inbound></policies>');
        expect(result.inbound).toHaveLength(0);
    });

    it('should handle invalid XML input gracefully', () => {
        const result = parsePolicyXml('');
        expect(result.inbound).toEqual([]);
    });
});
