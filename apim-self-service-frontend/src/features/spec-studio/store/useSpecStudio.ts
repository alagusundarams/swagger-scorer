/**
 * Zustand Store for Spec Studio Analysis State
 */

import { create } from 'zustand';
import { postAnalyze, type AnalysisResult } from '../api/analysisClient';

interface SpecStudioStore {
    // === CORE STATE ===
    spec: string;
    result: AnalysisResult | null;
    loading: boolean;
    error: string | null;

    // === NAVIGATION ===
    selectedLine: number | null;

    // === LAYOUT ===
    isMaximized: boolean;

    // === ACTIONS ===
    setSpec: (spec: string) => void;
    runAnalysis: () => Promise<void>;
    reset: () => void;
    selectLine: (line: number) => void;
    toggleMaximize: () => void;
}

export const useSpecStudio = create<SpecStudioStore>((set, get) => ({
    spec: '',
    result: null,
    loading: false,
    error: null,
    selectedLine: null,
    isMaximized: false,

    setSpec: (spec) => set({ spec }),

    runAnalysis: async () => {
        const { spec } = get();

        if (!spec.trim()) {
            set({ error: 'Interface content missing. Please enter a valid OpenAPI specification to analyze.' });
            return;
        }

        set({ loading: true, error: null, result: null, selectedLine: null });

        try {
            const response = await postAnalyze(spec);
            set({ result: response.data, loading: false });
        } catch (err: any) {
            const msg = err.response?.data?.message || err.message || 'Analysis failed. Please try again.';
            set({ error: msg, loading: false });
        }
    },

    reset: () => set({ result: null, error: null, loading: false, selectedLine: null }),

    selectLine: (line) => set({ selectedLine: line }),

    toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
}));
