/**
 * @fileoverview Parser utilities for OpenAPI/Swagger files
 * 
 * Handles parsing of JSON and YAML content into JavaScript objects.
 * Includes validation to ensure the content is valid OpenAPI/Swagger.
 */

import { load as parseYaml } from 'js-yaml';

/**
 * Parse OpenAPI content from JSON or YAML string
 * 
 * @param content - Raw string content (JSON or YAML)
 * @param format - Format of the content ('json' or 'yaml')
 * @returns Parsed OpenAPI object
 * @throws Error if parsing fails or content is invalid
 * 
 * Example:
 *   const spec = await parseOpenAPI(yamlString, 'yaml');
 *   console.log(spec.openapi); // "3.0.0"
 */
export async function parseOpenAPI(
    content: string,
    format: 'json' | 'yaml'
): Promise<Record<string, unknown>> {
    try {
        let parsed: unknown;

        if (format === 'json') {
            // Parse JSON - will throw if invalid
            parsed = JSON.parse(content);
        } else {
            // Parse YAML - js-yaml throws on invalid syntax
            parsed = parseYaml(content);
        }

        // Ensure we got an object, not a primitive or array
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            throw new Error('OpenAPI spec must be an object');
        }

        return parsed as Record<string, unknown>;
    } catch (error) {
        // Re-throw with more helpful error message
        const formatName = format.toUpperCase();
        throw new Error(`Failed to parse ${formatName}: ${error}`);
    }
}

/**
 * Validate that the parsed object is a valid OpenAPI/Swagger spec
 * 
 * This does basic validation - just checks for required top-level fields.
 * Spectral will do the detailed validation.
 * 
 * @param spec - Parsed OpenAPI object
 * @throws Error if not a valid OpenAPI spec
 * 
 * What we check:
 * - Has 'openapi' field (for OpenAPI 3.x) OR 'swagger' field (for Swagger 2.0)
 * - Has 'info' object
 * - Has 'paths' object
 */
export function validateOpenAPIStructure(spec: Record<string, unknown>): void {
    // Check for OpenAPI version field
    const hasOpenAPI = 'openapi' in spec;
    const hasSwagger = 'swagger' in spec;

    if (!hasOpenAPI && !hasSwagger) {
        throw new Error(
            'Not a valid OpenAPI specification: missing "openapi" or "swagger" field'
        );
    }

    // Check for required fields
    const missingFields: string[] = [];

    if (!('info' in spec)) {
        missingFields.push('info');
    }

    if (!('paths' in spec)) {
        missingFields.push('paths');
    }

    if (missingFields.length > 0) {
        throw new Error(
            `Invalid OpenAPI specification: missing required fields: ${missingFields.join(', ')}`
        );
    }
}

/**
 * Detect OpenAPI version from the spec
 * 
 * @param spec - Parsed OpenAPI object
 * @returns Version string (e.g., "3.0.0", "2.0")
 */
export function detectOpenAPIVersion(spec: Record<string, unknown>): string {
    if ('openapi' in spec && typeof spec.openapi === 'string') {
        return spec.openapi;
    }

    if ('swagger' in spec && typeof spec.swagger === 'string') {
        return spec.swagger;
    }

    return 'unknown';
}
