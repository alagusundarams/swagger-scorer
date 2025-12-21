/**
 * @fileoverview Analyzer API Client
 * 
 * Logic for interacting with the Analysis and Draft services.
 */

import { api, workflowApi } from '../../../api/baseClient';

/**
 * Analysis result returned from the /analyze endpoint.
 */
export interface AnalysisResult {
    score: number;
    status: 'red' | 'amber' | 'green';
    categories: Array<{
        name: string;
        score: number;
        weight: number;
        violationCount: number;
    }>;
    violations: Array<{
        rule: string;
        message: string;
        path: string;
        line: number;
        severity: 'error' | 'warning' | 'info' | 'hint';
        category: string;
    }>;
}

// === ANALYZER ENDPOINTS ===
export const postAnalyze = (spec: string) =>
    api.post<AnalysisResult>('/analyze', { content: spec, format: 'yaml' });

export const saveDraft = (spec: string, token: string, apiTitle?: string) =>
    workflowApi.post<{ success: true; requestId: string }>('/drafts',
        { spec, apiTitle },
        { headers: { Authorization: `Bearer ${token}` } }
    );

export const getLatestDraft = (token: string) =>
    workflowApi.get<{ spec: string; apiTitle: string; updatedAt: string }>('/drafts/latest',
        { headers: { Authorization: `Bearer ${token}` } }
    );
