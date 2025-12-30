/**
 * Status & UI Mapping Utilities
 * 
 * Centralized color and theme logic for common statuses and environments.
 */

export type Environment = 'ALL' | 'DEV' | 'QA' | 'STAGE' | 'PROD';

export interface StatusTheme {
    bg: string;
    text: string;
    border: string;
    dot?: string;
}

/**
 * Returns consistent theme classes for environments.
 */
export const getEnvironmentTheme = (env: string): StatusTheme => {
    switch (env?.toUpperCase()) {
        case 'PROD':
            return {
                bg: 'bg-emerald-100 dark:bg-emerald-900/30',
                text: 'text-emerald-700 dark:text-emerald-400',
                border: 'border-emerald-200 dark:border-emerald-800',
                dot: 'bg-emerald-500'
            };
        case 'QA':
            return {
                bg: 'bg-blue-100 dark:bg-blue-900/30',
                text: 'text-blue-700 dark:text-blue-400',
                border: 'border-blue-200 dark:border-blue-800',
                dot: 'bg-blue-500'
            };
        case 'STAGE':
            return {
                bg: 'bg-indigo-100 dark:bg-indigo-900/30',
                text: 'text-indigo-700 dark:text-indigo-400',
                border: 'border-indigo-200 dark:border-indigo-800',
                dot: 'bg-indigo-500'
            };
        case 'DEV':
            return {
                bg: 'bg-amber-100 dark:bg-amber-900/30',
                text: 'text-amber-700 dark:text-amber-400',
                border: 'border-amber-200 dark:border-amber-800',
                dot: 'bg-amber-500'
            };
        default:
            return {
                bg: 'bg-slate-100 dark:bg-slate-900/30',
                text: 'text-slate-700 dark:text-slate-400',
                border: 'border-slate-200 dark:border-slate-800',
                dot: 'bg-slate-500'
            };
    }
};

/**
 * Returns consistent theme classes for quality scores.
 */
export const getScoreTheme = (score: number): string => {
    if (score >= 90) return 'text-green-500 stroke-green-500';
    if (score >= 70) return 'text-amber-500 stroke-amber-500';
    return 'text-red-500 stroke-red-500';
};
/**
 * Returns consistent theme classes for general statuses (Visibility, etc).
 */
export const getStatusTheme = (status: string): StatusTheme => {
    switch (status?.toLowerCase()) {
        case 'active':
        case 'published':
        case 'public':
            return {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-500',
                border: 'border-emerald-500/20'
            };
        case 'pending':
        case 'private':
            return {
                bg: 'bg-amber-500/10',
                text: 'text-amber-500',
                border: 'border-amber-500/20'
            };
        case 'deprecated':
        case 'owner-only':
            return {
                bg: 'bg-red-500/10',
                text: 'text-red-500',
                border: 'border-red-500/20'
            };
        case 'reconciled':
        case 'synced':
            return {
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-500',
                border: 'border-emerald-500/20'
            };
        case 'drifted':
        case 'suspended':
            return {
                bg: 'bg-red-500/10',
                text: 'text-red-500',
                border: 'border-red-500/20'
            };
        default:
            return {
                bg: 'bg-gray-500/10',
                text: 'text-gray-500',
                border: 'border-gray-500/20'
            };
    }
};

/**
 * Returns the next logical environment in the promotion cycle.
 */
export const getNextEnvironment = (current?: string): Environment => {
    const stages: Environment[] = ['DEV', 'QA', 'STAGE', 'PROD'];
    const idx = stages.indexOf((current?.toUpperCase() || 'DEV') as Environment);
    return idx < stages.length - 1 ? stages[idx + 1] : 'PROD';
};
