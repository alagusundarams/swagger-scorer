import { create } from 'zustand';
import { postAnalyze, type AnalysisResult } from '../api/client';

interface AnalysisStore {
    spec: string;
    result: AnalysisResult | null;
    loading: boolean;
    error: string | null;
    setSpec: (spec: string) => void;
    runAnalysis: () => Promise<void>;
    reset: () => void;
    // Navigation
    selectedLine: number | null;
    selectLine: (line: number) => void;
    // Layout
    isMaximized: boolean;
    toggleMaximize: () => void;
}

export const useAnalysis = create<AnalysisStore>((set, get) => ({
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
            set({ error: 'Please enter a valid OpenAPI specification.' });
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
