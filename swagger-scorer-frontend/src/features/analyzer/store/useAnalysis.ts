/**
 * @fileoverview Zustand Store for Analysis State
 * 
 * This store manages the global state for the Swagger Scorer application.
 * It uses Zustand for simple, scalable state management.
 * 
 * State includes:
 * - spec: The OpenAPI YAML content being edited
 * - result: Analysis results from the backend
 * - loading/error: Request state
 * - selectedLine: Line navigation for violation clicks
 * - isMaximized: Editor maximize toggle
 * 
 * @module useAnalysis
 */

import { create } from 'zustand';
import { postAnalyze, type AnalysisResult } from '../api/client';

/**
 * Interface defining the shape of the analysis store.
 */
interface AnalysisStore {
    // === CORE STATE ===
    /** OpenAPI specification content (YAML string) */
    spec: string;
    /** Analysis result from backend API */
    result: AnalysisResult | null;
    /** Loading state during API calls */
    loading: boolean;
    /** Error message if analysis fails */
    error: string | null;

    // === NAVIGATION ===
    /** Currently selected line number (from violation click) */
    selectedLine: number | null;

    // === LAYOUT ===
    /** Whether editor is in maximized mode */
    isMaximized: boolean;

    // === ACTIONS ===
    /** Update the spec content */
    setSpec: (spec: string) => void;
    /** Run analysis against the backend API */
    runAnalysis: () => Promise<void>;
    /** Reset all state to initial values */
    reset: () => void;
    /** Navigate to a specific line in editor */
    selectLine: (line: number) => void;
    /** Toggle editor maximize state */
    toggleMaximize: () => void;
}

/**
 * Zustand store hook for analysis state.
 * 
 * @example
 * // In a component:
 * const { spec, setSpec, runAnalysis, result } = useAnalysis();
 */
export const useAnalysis = create<AnalysisStore>((set, get) => ({
    // === INITIAL STATE ===
    spec: '',
    result: null,
    loading: false,
    error: null,
    selectedLine: null,
    isMaximized: false,

    // === ACTIONS ===

    /**
     * Update the OpenAPI spec content.
     */
    setSpec: (spec) => set({ spec }),

    /**
     * Run analysis against the backend API.
     * Validates input, calls API, and updates state with results.
     */
    runAnalysis: async () => {
        const { spec } = get();

        // Validate input
        if (!spec.trim()) {
            set({ error: 'Please enter a valid OpenAPI specification.' });
            return;
        }

        // Set loading state
        set({ loading: true, error: null, result: null, selectedLine: null });

        try {
            // Call backend API
            const response = await postAnalyze(spec);
            set({ result: response.data, loading: false });
        } catch (err: any) {
            // Handle errors gracefully
            const msg = err.response?.data?.message || err.message || 'Analysis failed. Please try again.';
            set({ error: msg, loading: false });
        }
    },

    /**
     * Reset all state to initial values.
     */
    reset: () => set({ result: null, error: null, loading: false, selectedLine: null }),

    /**
     * Navigate to a specific line in the editor.
     * Used when user clicks a violation.
     */
    selectLine: (line) => set({ selectedLine: line }),

    /**
     * Toggle editor maximize/restore state.
     */
    toggleMaximize: () => set((state) => ({ isMaximized: !state.isMaximized })),
}));
