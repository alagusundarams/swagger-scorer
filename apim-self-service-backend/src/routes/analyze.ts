/**
 * @fileoverview Analyze API route
 * 
 * This is the main endpoint that accepts OpenAPI specs and returns scores.
 * 
 * Flow:
 * 1. Receive request with OpenAPI content (JSON or YAML)
 * 2. Parse and validate the content
 * 3. Run Spectral to find violations
 * 4. Calculate score from violations
 * 5. Return full analysis result
 */

import { FastifyInstance } from 'fastify';
import { parseOpenAPI, validateOpenAPIStructure, detectOpenAPIVersion } from '../services/parser.js';
import { createSpectral, analyzeWithSpectral } from '../services/spectral.js';
import { calculateScore } from '../services/scorer.js';
import { AnalyzeRequest, ScoringConfig } from '../types/index.js';

/**
 * Register analyze route
 * 
 * POST /api/v1/analyze
 * Body: { content: string, format: "json" | "yaml" }
 * Returns: { score, status, categories, violations, metadata }
 * 
 * @param fastify - Fastify instance
 * @param config - Scoring configuration
 */
export async function analyzeRoutes(
    fastify: FastifyInstance,
    config: ScoringConfig
): Promise<void> {
    // Define request body schema for validation
    // Fastify will automatically validate requests against this
    const analyzeSchema = {
        body: {
            type: 'object',
            required: ['content', 'format'],
            properties: {
                content: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 5242880, // 5MB in bytes
                },
                format: {
                    type: 'string',
                    enum: ['json', 'yaml'],
                },
            },
        },
    };

    // Create Spectral instance once (reused across requests)
    const spectral = await createSpectral();

    fastify.post<{ Body: AnalyzeRequest }>(
        '/analyze',
        { schema: analyzeSchema },
        async (request, reply) => {
            const { content, format } = request.body;

            try {
                // Step 1: Parse the content (JSON or YAML → JavaScript object)
                fastify.log.info({ format, size: content.length }, 'Parsing OpenAPI content');
                let spec;
                try {
                    spec = await parseOpenAPI(content, format);
                } catch (parseError: any) {
                    // Gracefully handle parsing errors by returning a score of 0
                    fastify.log.warn({ err: parseError }, 'Parse error, returning as violation');
                    return reply.send({
                        score: 0,
                        status: 'red',
                        categories: [],
                        violations: [{
                            rule: 'parser-error',
                            message: `Syntax Error: ${parseError.message}`,
                            path: 'parser',
                            line: 1,
                            severity: 'error',
                            category: 'structural'
                        }],
                        metadata: {
                            specVersion: 'unknown',
                            analyzedAt: new Date().toISOString(),
                            unresolvedRefs: 0
                        }
                    });
                }

                // Step 2: Validate basic OpenAPI structure
                validateOpenAPIStructure(spec);
                const specVersion = detectOpenAPIVersion(spec);
                fastify.log.info({ version: specVersion }, 'Detected OpenAPI version');

                // Step 3: Run Spectral analysis to find violations
                fastify.log.info('Running Spectral analysis');
                const violations = await analyzeWithSpectral(spec, spectral, content); // Pass original content
                fastify.log.info({ count: violations.length }, 'Spectral analysis complete');

                // Step 4: Calculate score from violations
                const result = calculateScore(violations, config, specVersion);
                fastify.log.info(
                    { score: result.score, status: result.status },
                    'Score calculation complete'
                );

                // Step 5: Return result
                return reply.send(result);
            } catch (error) {
                // Handle different types of errors
                if (error instanceof Error) {
                    // Check if it's a validation error
                    if (error.message.includes('Invalid OpenAPI') || error.message.includes('Not a valid OpenAPI')) {
                        return reply.send({
                            score: 0,
                            status: 'red',
                            categories: [],
                            violations: [{
                                rule: 'structure-error',
                                message: error.message,
                                path: 'root',
                                line: 1,
                                severity: 'error',
                                category: 'structure'
                            }],
                            metadata: {
                                specVersion: 'unknown',
                                analyzedAt: new Date().toISOString(),
                                unresolvedRefs: 0
                            }
                        });
                    }
                }

                // Generic error
                fastify.log.error(error, 'Analysis failed');
                return reply.status(500).send({
                    statusCode: 500,
                    error: 'Internal Server Error',
                    message: 'Failed to analyze specification',
                });
            }
        }
    );

    /**
     * POST /api/v1/analyze/:productId
     * Fetch OpenAPI spec from product's Git repo or APIM and analyze it
     */
    fastify.post<{ Params: { productId: string } }>(
        '/analyze/:productId',
        async (request, reply) => {
            const { productId } = request.params;

            try {
                // Import spec fetcher service
                const { fetchSpecForProduct } = await import('../services/spec-fetcher.service.js');

                // Fetch spec from Git or APIM
                fastify.log.info({ productId }, 'Fetching OpenAPI spec for product');
                const specContent = await fetchSpecForProduct(productId);

                // Detect format and parse
                const format = specContent.trim().startsWith('{') ? 'json' : 'yaml';
                const spec = await parseOpenAPI(specContent, format as 'json' | 'yaml');

                // Validate structure
                const openapiVersion = detectOpenAPIVersion(spec);
                validateOpenAPIStructure(spec, openapiVersion);

                // Run Spectral analysis
                const violations = await analyzeWithSpectral(spec, spectral);

                // Calculate score
                const analysis = calculateScore(violations, config, openapiVersion);

                return reply.send({
                    ...analysis,
                    productId,
                    metadata: {
                        version: openapiVersion,
                        format,
                        ...analysis.metadata,
                    },
                });
            } catch (error: any) {
                fastify.log.error({ err: error, productId }, 'Error analyzing product');
                return reply.status(500).send({
                    error: 'Internal Server Error',
                    message: `Failed to analyze product: ${error.message}`,
                });
            }
        }
    );
}
