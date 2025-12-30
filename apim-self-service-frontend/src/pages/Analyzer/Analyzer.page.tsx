import { useEffect } from 'react';
import { useAnalysis } from '../../features/analyzer/store/useAnalysis';
import { useStore } from '../../store/useStore';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { AnalyzerForm } from '../../features/analyzer/components/AnalyzerForm';
import { ScoreCard } from '../../features/analyzer/components/ScoreCard';
import { ViolationsTable } from '../../features/analyzer/components/ViolationsTable';
import '../../features/analyzer/analyzer.css';

/**
 * AnalyzerPage Controller
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * Route Entry Point for `/analyzer`.
 * Provides a "Workstation" for Linter/Compliance checks on API Specs.
 * 
 * 🔄 Data Flow:
 * 1. `AnalyzerForm` -> Captures API Spec (Paste or Upload).
 * 2. `useAnalysis` -> Runs Client-side Linter (Spectral-like).
 * 3. `ScoreCard` & `ViolationsTable` -> Renders results.
 * 
 * 🧩 MFE Boundaries:
 * - This Page orchestrates the "Analyzer" feature.
 * - It uses `MainLayout` but overrides the shell for a "Workstation Mode" (Fullscreen).
 * ------------------------------------------------------------------
 */
export function AnalyzerPage() {
    const { isMaximized } = useAnalysis();
    const { setPageTitle } = useStore();

    useEffect(() => {
        setPageTitle('API Analyzer');
    }, [setPageTitle]);

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden bg-[#1e1e1e]">
                <main className="flex-1 flex overflow-hidden relative">
                    {/* Left: Input (Standard/Monaco) */}
                    <div className={`h-full flex flex-col border-r-2 border-[#1e1e1e] transition-all duration-300 ${isMaximized ? 'w-full' : 'w-1/2'}`}>
                        <AnalyzerForm />
                    </div>

                    {/* Right: Output (Results) */}
                    {!isMaximized && (
                        <div className="w-1/2 h-full overflow-y-auto bg-gray-50 p-8 space-y-8 pb-20">
                            <ScoreCard />
                            <ViolationsTable />
                        </div>
                    )}
                </main>
                <div className="bg-slate-900 border-t border-slate-700 p-2 z-50 shrink-0">
                    <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest">Analyzer Mode</p>
                </div>
            </div>
        </MainLayout>
    );
}
