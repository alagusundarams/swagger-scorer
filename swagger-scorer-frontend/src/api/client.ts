/**
 * @fileoverview API Client
 * 
 * Centralized Axios instance for backend API communication.
 * Handles all HTTP requests to the Swagger Scorer backend.
 * 
 * Environment Configuration:
 * - Development: Uses VITE_API_URL or defaults to localhost:3001
 * - Production: Nginx proxies /api to the backend container
 * 
 * @module client
 */

import axios from 'axios';

/**
 * Axios instance configured for the Swagger Scorer API.
 * Automatically handles base URL and content type.
 */
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

// Separate instance for Workflow Service (different port/URL in dev)
const workflowApi = axios.create({
    baseURL: import.meta.env.VITE_WORKFLOW_API_URL || 'http://localhost:3002/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

/**
 * Analysis result returned from the /analyze endpoint.
 */
export interface AnalysisResult {
    /** Overall score (0-100) */
    score: number;

    /** RAG status indicator */
    status: 'red' | 'amber' | 'green';

    /** Legacy RAG field (deprecated, for backwards compat) */
    rag?: 'RED' | 'AMBER' | 'GREEN';

    /** Breakdown by category */
    categories: Array<{
        /** Category name (e.g., 'security', 'documentation') */
        name: string;
        /** Category score (0-100) */
        score: number;
        /** Category weight as percentage of total */
        weight: number;
        /** Number of violations in this category */
        violationCount: number;
    }>;

    /** List of all violations found */
    violations: Array<{
        /** Rule ID that was violated */
        rule: string;
        /** Human-readable message */
        message: string;
        /** JSONPath to the violation location */
        path: string;
        /** Line number in the source file */
        line: number;
        /** Severity level */
        severity: 'error' | 'warning' | 'info' | 'hint';
        /** Category this violation belongs to */
        category: string;
    }>;
}

/**
 * Submit an OpenAPI specification for analysis.
 * 
 * @param spec - The OpenAPI spec content (YAML string)
 * @returns Promise with analysis results
 * 
 * @example
 * const result = await postAnalyze(yamlContent);
 * console.log(result.data.score); // 85
 */
export const postAnalyze = (spec: string) =>
    api.post<AnalysisResult>('/analyze', { content: spec, format: 'yaml' });

/**
 * Save the current spec as a draft.
 * Requires Authentication.
 */
export const saveDraft = (spec: string, token: string, apiTitle?: string) =>
    workflowApi.post<{ success: true; requestId: string }>('/drafts',
        { spec, apiTitle },
        { headers: { Authorization: `Bearer ${token}` } }
    );

/**
 * Get the latest draft for the signed-in user.
 * Requires Authentication.
 */
export const getLatestDraft = (token: string) =>
    workflowApi.get<{ spec: string; apiTitle: string; updatedAt: string }>('/drafts/latest',
        { headers: { Authorization: `Bearer ${token}` } }
    );
