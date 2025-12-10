// src/api/client.ts
import axios from 'axios';

// Centralized Axios instance
// In dev, Vite proxies /api to localhost:3001
// In prod, Nginx proxies /api to the backend container
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1',
    headers: { 'Content-Type': 'application/json' },
});

export interface AnalysisResult {
    score: number;
    status: 'red' | 'amber' | 'green';
    rag?: 'RED' | 'AMBER' | 'GREEN'; // deprecated, for backwards compat
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

export const postAnalyze = (spec: string) =>
    api.post<AnalysisResult>('/analyze', { content: spec, format: 'yaml' });
