/**
 * @fileoverview Tests for OpenAPI parser
 * 
 * These tests verify that we can parse JSON and YAML correctly,
 * and that we properly validate OpenAPI structure.
 * 
 * NO MOCKING: We test with real data (sample OpenAPI specs)
 */

import { describe, it, expect } from 'vitest';
import { parseOpenAPI, validateOpenAPIStructure, detectOpenAPIVersion } from './ParserService.js';

describe('Parser Service', () => {
    /**
     * Test: Parse valid JSON OpenAPI spec
     * 
     * Why: Users can submit JSON format
     * How: Parse a minimal valid OpenAPI 3.0 spec as JSON string
     */
    it('should parse valid JSON OpenAPI spec', async () => {
        const jsonContent = JSON.stringify({
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {},
        });

        const result = await parseOpenAPI(jsonContent, 'json');

        expect(result.openapi).toBe('3.0.0');
        expect(result.info).toBeDefined();
    });

    /**
     * Test: Parse valid YAML OpenAPI spec
     * 
     * Why: Users can submit YAML format (more common for OpenAPI)
     * How: Parse a minimal valid spec as YAML string
     */
    it('should parse valid YAML OpenAPI spec', async () => {
        const yamlContent = `
openapi: 3.0.0
info:
  title: Test API
  version: 1.0.0
paths: {}
    `;

        const result = await parseOpenAPI(yamlContent, 'yaml');

        expect(result.openapi).toBe('3.0.0');
        expect(result.info).toBeDefined();
    });

    /**
     * Test: Reject invalid JSON
     * 
     * Why: Need to give clear error if JSON is malformed
     * How: Try to parse broken JSON syntax
     */
    it('should throw error for invalid JSON', async () => {
        const invalidJSON = '{ invalid json }';

        await expect(parseOpenAPI(invalidJSON, 'json')).rejects.toThrow('Failed to parse JSON');
    });

    /**
     * Test: Reject invalid YAML
     * 
     * Why: Need to give clear error if YAML is malformed
     * How: Try to parse broken YAML syntax
     */
    it('should throw error for invalid YAML', async () => {
        const invalidYAML = 'invalid: yaml: :';

        await expect(parseOpenAPI(invalidYAML, 'yaml')).rejects.toThrow('Failed to parse YAML');
    });

    /**
     * Test: Validate OpenAPI structure
     * 
     * Why: Even if JSON/YAML is valid, it must be a valid OpenAPI spec
     * How: Check that spec has required fields (openapi/swagger, info, paths)
     */
    it('should validate correct OpenAPI structure', () => {
        const validSpec = {
            openapi: '3.0.0',
            info: { title: 'Test', version: '1.0' },
            paths: {},
        };

        // Should not throw
        expect(() => validateOpenAPIStructure(validSpec)).not.toThrow();
    });

    /**
     * Test: Reject spec missing required fields
     * 
     * Why: Incomplete specs can't be properly analyzed
     * How: Try validating spec without 'info' field
     */
    it('should reject spec missing required fields', () => {
        const invalidSpec = {
            openapi: '3.0.0',
            // Missing 'info' and 'paths'
        };

        expect(() => validateOpenAPIStructure(invalidSpec)).toThrow('missing required fields');
    });

    /**
     * Test: Detect OpenAPI version
     * 
     * Why: We need to know if it's OpenAPI 3.x or Swagger 2.0
     * How: Check the version field
     */
    it('should detect OpenAPI version', () => {
        const spec3 = { openapi: '3.0.0', info: {}, paths: {} };
        const spec2 = { swagger: '2.0', info: {}, paths: {} };

        expect(detectOpenAPIVersion(spec3)).toBe('3.0.0');
        expect(detectOpenAPIVersion(spec2)).toBe('2.0');
    });
});
