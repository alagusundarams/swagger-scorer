/**
 * @fileoverview Type definitions for the Swagger scoring system
 * 
 * This file contains all TypeScript interfaces and types used throughout the application.
 * Keeping types in one place makes it easier to maintain and understand data structures.
 */

/**
 * Category configuration for scoring
 * Each category has a weight (percentage) and can be enabled/disabled
 */
export interface CategoryConfig {
    weight: number;   // Percentage weight (e.g., 30 for 30%)
    enabled: boolean; // Whether this category is active
}

/**
 * Main scoring configuration loaded from YAML
 * This defines how the scoring system calculates quality scores
 */
export interface ScoringConfig {
    version: string;

    // Map of category name to its configuration
    categories: {
        security: CategoryConfig;
        structural: CategoryConfig;
        apiDesign: CategoryConfig;
        documentation: CategoryConfig;
        dataModels: CategoryConfig;
        errorHandling: CategoryConfig;
    };

    // Multipliers for different severity levels
    // error: 1.0 means full deduction, warning: 0.5 means half deduction
    severityMultipliers: {
        error: number;
        warning: number;
        info: number;
        hint: number;
    };

    // Score thresholds for status colors
    thresholds: {
        green: number;  // Score >= green = excellent (default: 95)
        amber: number;  // Score >= amber = needs improvement (default: 85)
        // Anything below amber is red (poor quality)
    };
}

/**
 * A single violation found by Spectral
 * This represents one rule that was broken in the OpenAPI spec
 */
export interface Violation {
    rule: string;        // Name of the Spectral rule that was violated
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;     // Human-readable description of the violation
    path: string;        // JSON path where the violation occurred (e.g., "paths./users.get")
    line: number;        // Line number in the original file
    category: string;    // Which scoring category this violation belongs to
}

/**
 * Score breakdown for a single category
 * Shows how well the spec performed in one aspect (e.g., documentation)
 */
export interface CategoryScore {
    name: string;          // Category name (e.g., "documentation")
    score: number;         // Score for this category (0-100)
    weight: number;        // Weight percentage (e.g., 30)
    violationCount: number; // Number of violations in this category
}

/**
 * Overall quality status based on score
 * Green = excellent, Amber = needs work, Red = poor quality
 */
export type QualityStatus = 'green' | 'amber' | 'red';

/**
 * Complete analysis result returned by the API
 * This is what the frontend receives after analyzing a spec
 */
export interface AnalysisResult {
    score: number;               // Overall score (0-100)
    status: QualityStatus;       // Green/Amber/Red indicator
    categories: CategoryScore[]; // Breakdown by category
    violations: Violation[];     // All violations found
    metadata: {
        specVersion: string;       // OpenAPI version (e.g., "3.0.0")
        analyzedAt: string;        // ISO timestamp when analysis happened
        unresolvedRefs: number;    // Number of $ref that couldn't be resolved
    };
}

/**
 * Request body for the /analyze endpoint
 * User submits OpenAPI content in JSON or YAML format
 */
export interface AnalyzeRequest {
    content: string;           // Raw OpenAPI/Swagger content
    format: 'json' | 'yaml';   // Format of the content
}

/**
 * Azure Environment metadata
 */
export interface AzureEnvironment {
    name: string;
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
}

/**
 * Error response structure
 * Consistent error format for all API errors
 */
export interface ErrorResponse {
    statusCode: number;
    error: string;
    message: string;
    details?: unknown; // Optional additional details about the error
}
/**
 * Global Application Configuration
 * Loaded from config.json
 */
export interface AppConfig {
    azure: {
        environments: AzureEnvironment[];
        tenantId: string;
        clientId: string;
    };
    database: {
        url: string;
    };
    devops: {
        pat: string;
        organization: string;
    };
    server: {
        port: number;
        logLevel: string;
        host?: string;
    };
    // New Configuration Sections
    externalLinks: {
        serviceNow: string;
        portIo: string;
    };
    apim: {
        gatewayUrlData: string; // e.g. "api.ionosphere.io"
        portalUrl: string;
    };
    identity: {
        defaultAdGroup: string;
    };
    // Feature Flags & Dev Validations
    storagePath?: string;
    gitLocalOnly?: boolean;
    gitLocalPath?: string;
    useBackendMocks?: boolean;
}

// === Policy Studio Types ===
export type PolicyScope = 'global' | 'product' | 'api' | 'operation';
export type PolicyStepType = 'base' | 'rate-limit' | 'cors' | 'mock-response' | 'set-header' | 'validate-jwt' | 'ip-filter' | 'custom-xml' | 'palette-item';
export type PolicySection = 'inbound' | 'backend' | 'outbound' | 'onError';

export interface PolicyStep {
    id: string;
    type: PolicyStepType;
    displayName: string;
    description?: string;
    scope: PolicyScope;
    isLocked: boolean;
    properties: Record<string, any>;
    xmlSnippet?: string; // For base/custom policies
    customXmlContent?: string;
}

export interface PolicyFlow {
    inbound: PolicyStep[];
    backend: PolicyStep[];
    outbound: PolicyStep[];
    onError: PolicyStep[];
}
