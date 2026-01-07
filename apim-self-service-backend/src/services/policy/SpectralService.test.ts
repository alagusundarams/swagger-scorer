/**
 * @fileoverview Integration tests for Spectral service
 * 
 * Verifies that Spectral correctly identifies violations in OpenAPI specs.
 * Uses real Spectral instance and rulesets.
 */

import { describe, it, expect } from 'vitest';
import { createSpectral, analyzeWithSpectral } from './SpectralService.js';
import { parseOpenAPI } from './ParserService.js';

describe('Spectral Service', () => {
    it('should find violations in a sample spec', async () => {
        // Minimal spec with intentional issues
        const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
  # Missing description, contact, license
paths:
  /test:
    get:
      # Missing description, tags
      responses:
        '200':
          description: OK
    `;

        const spec = await parseOpenAPI(yamlContent, 'yaml');
        const spectral = await createSpectral();
        const violations = await analyzeWithSpectral(spec, spectral);

        // Should find multiple violations
        expect(violations.length).toBeGreaterThan(0);

        // Check for specific expected violations
        // info-description is a standard OAS rule
        const hasInfoDescError = violations.some(v => v.rule === 'info-description');
        expect(hasInfoDescError).toBe(true);

        // Check structure of violation object
        const violation = violations[0];
        expect(violation).toHaveProperty('rule');
        expect(violation).toHaveProperty('severity');
        expect(violation).toHaveProperty('message');
        expect(violation).toHaveProperty('path');
        expect(violation).toHaveProperty('line');
        expect(violation).toHaveProperty('category');
    });

    it('should return empty violations for perfect spec', async () => {
        // A valid spec that should pass basic rules
        const validSpec = {
            openapi: '3.0.0',
            info: {
                title: 'Valid API',
                version: '1.0.0',
                description: 'A valid API description',
                contact: { name: 'Support', email: 'support@example.com' },
                license: { name: 'MIT', url: 'https://opensource.org/licenses/MIT' }
            },
            servers: [{ url: 'https://api.example.com' }],
            tags: [{ name: 'test', description: 'Test tag' }],
            paths: {
                '/test': {
                    get: {
                        tags: ['test'],
                        operationId: 'getTest',
                        summary: 'Get test',
                        description: 'Get test resource',
                        security: [{ api_key: [] }], // Added security
                        responses: {
                            '200': {
                                description: 'OK',
                                content: {
                                    'application/json': {
                                        schema: {
                                            type: 'object',
                                            properties: {
                                                id: { type: 'string' }
                                            }
                                        }
                                    }
                                }
                            },
                            '400': { description: 'Bad Request' }, // Added 400
                            '500': { description: 'Server Error' } // Added 500
                        }
                    }
                }
            },
            components: {
                securitySchemes: {
                    api_key: {
                        type: 'apiKey',
                        name: 'api_key',
                        in: 'header'
                    }
                }
            }
        };

        const spectral = await createSpectral();
        const violations = await analyzeWithSpectral(validSpec, spectral);

        // Note: It might still find some info/hint level issues depending on ruleset
        // But shouldn't have errors
        const errors = violations.filter(v => v.severity === 'error');
        expect(errors).toHaveLength(0);
    });
});
