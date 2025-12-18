/**
 * @fileoverview Spectral integration service
 * 
 * This service runs Spectral linting on OpenAPI specs and returns violations.
 * Spectral is the core engine that checks the spec against all our rules.
 */

// @ts-ignore
import spectralCore from '@stoplight/spectral-core';
// @ts-ignore
const { Spectral: SpectralClass, Document: DocumentClass } = spectralCore;
import type { Spectral, RulesetDefinition } from '@stoplight/spectral-core';
// @ts-ignore
import spectralRulesets from '@stoplight/spectral-rulesets';
// @ts-ignore
const { oas } = spectralRulesets;
// @ts-ignore
import spectralParsers from '@stoplight/spectral-parsers';
// @ts-ignore
const { Yaml, Json } = spectralParsers;
// @ts-ignore
import spectralFunctions from '@stoplight/spectral-functions';
// @ts-ignore
const { pattern, truthy } = spectralFunctions;

import { Violation } from '../types/index.js';
import { readFile } from 'fs/promises';
import { join } from 'path';
import { load as parseYaml } from 'js-yaml';

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

/**
 * Create and configure a Spectral instance
 * 
 * Spectral is the linting engine. We configure it with:
 * - Built-in OpenAPI rules (from @stoplight/spectral-rulesets)
 * - Custom rules from config/spectral-rules.yaml
 * 
 * @returns Configured Spectral instance ready to lint
 */
export async function createSpectral(): Promise<Spectral> {
    const spectral = new SpectralClass();

    // 1. Load custom rules from config file
    let customRules = {};
    try {
        const rulesPath = join(process.cwd(), 'config/spectral-rules.yaml');
        const fileContent = await readFile(rulesPath, 'utf-8');
        const customConfig = parseYaml(fileContent) as { rules: Record<string, unknown> };

        if (customConfig && customConfig.rules) {
            customRules = customConfig.rules;

            // Hydrate function strings to actual functions
            const functionMap: Record<string, any> = { pattern, truthy };
            for (const key of Object.keys(customRules)) {
                // @ts-ignore
                const rule = customRules[key];
                if (rule.then) {
                    const thens = Array.isArray(rule.then) ? rule.then : [rule.then];
                    for (const t of thens) {
                        if (typeof t.function === 'string' && functionMap[t.function]) {
                            t.function = functionMap[t.function];
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.warn('Could not load custom Spectral rules, using defaults only:', error);
    }

    // 2. Create ruleset with built-in OAS rules and custom rules
    const ruleset: RulesetDefinition = {
        extends: [oas as any],
        rules: {
            ...customRules
        }
    };

    spectral.setRuleset(ruleset);

    return spectral;
}

/**
 * Analyze OpenAPI spec using Spectral
 * 
 * This is the core linting function. It runs Spectral and returns violations.
 * 
 * @param spec - Parsed OpenAPI specification object
 * @param spectral - Configured Spectral instance
 * @returns Array of violations found by Spectral
 * 
 * How it works:
 * 1. Spectral checks the spec against all enabled rules
 * 2. For each broken rule, it returns a "diagnostic" (violation)
 * 3. We convert Spectral diagnostics to our Violation format
 * 
 * Example:
 *   const violations = await analyzeWithSpectral(spec, spectral);
 *   violations.forEach(v => console.log(`${v.rule}: ${v.message}`));
 */
export async function analyzeWithSpectral(
    spec: Record<string, unknown>,
    spectral: Spectral,
    originalContent?: string
): Promise<Violation[]> {
    // 1. Determine content format and parser
    // If originalContent is provided, check if it looks like JSON
    const content = originalContent || JSON.stringify(spec, null, 2);
    const isJson = content.trim().startsWith('{');
    const parser = isJson ? spectralParsers.Json : spectralParsers.Yaml;
    const filename = isJson ? 'openapi.json' : 'openapi.yaml';

    // 2. Create Document
    // Using the appropriate parser ensures Spectral understands the line numbers correctly
    const document = new DocumentClass(
        content,
        parser as any,
        filename
    );

    // 3. Run Spectral
    try {
        const results = await spectral.run(document);
        const mappings = await loadCategoryMappings();

        return results.map((diagnostic) => ({
            rule: diagnostic.code as string,
            severity: diagnostic.severity === 0 ? 'error' : diagnostic.severity === 1 ? 'warning' : 'info',
            message: diagnostic.message,
            path: diagnostic.path.join('.'),
            line: diagnostic.range.start.line + 1,
            category: determineCategory(diagnostic.code as string, mappings),
        }));
    } catch (err: any) {
        // Fallback for catastrophic Spectral errors
        console.error("Spectral run failed:", err);
        return [{
            rule: 'parser-error',
            severity: 'error',
            message: err.message || 'Failed to parse specification',
            path: 'root',
            line: 1,
            category: 'structural'
        }];
    }
}

/**
 * Category mapping cache
 */
let categoryMappings: Array<{ pattern: RegExp; category: string }> | null = null;

/**
 * Load category mappings from config file
 */


async function loadCategoryMappings(): Promise<Array<{ pattern: RegExp; category: string }>> {
    if (categoryMappings) {
        return categoryMappings;
    }

    try {
        // Resolve path relative to this file (src/services/spectral.ts)
        // Config is in project_root/config/rule-categories.yaml
        const mappingPath = join(process.cwd(), 'config/rule-categories.yaml');
        const fileContent = await readFile(mappingPath, 'utf-8');
        const config = parseYaml(fileContent) as { mappings: Array<{ pattern: string; category: string }> };

        if (config && Array.isArray(config.mappings)) {
            categoryMappings = config.mappings.map(m => ({
                pattern: new RegExp(m.pattern),
                category: m.category
            }));
        } else {
            throw new Error('Invalid mapping config structure');
        }
    } catch (error) {
        console.warn('Could not load category mappings, using defaults:', error);
        // Fallback defaults if file fails
        categoryMappings = [
            { pattern: /info-description|info-contact|info-license|operation-tags|example/, category: 'documentation' },
            { pattern: /operation-operationId|tag|server|path/, category: 'apiDesign' },
            { pattern: /security|owasp/, category: 'security' },
            { pattern: /schema|type|enum|component/, category: 'dataModels' },
            { pattern: /response|error/, category: 'errorHandling' },
            { pattern: /.*/, category: 'structural' }
        ];
    }

    return categoryMappings;
}

/**
 * Determine which scoring category a rule belongs to
 *
 * Matches the rule name against patterns defined in config/rule-categories.yaml
 * 
 * @param ruleCode - Spectral rule name
 * @param mappings - Loaded category mappings
 * @returns Category name
 */
function determineCategory(
    ruleCode: string,
    mappings: Array<{ pattern: RegExp; category: string }>
): string {
    for (const mapping of mappings) {
        if (mapping.pattern.test(ruleCode)) {
            return mapping.category;
        }
    }
    return 'structural'; // Should be caught by .* pattern anyway
}
