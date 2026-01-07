import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { SpecStudio, useSpecStudio } from '../../features/spec-studio';

/**
 * ------------------------------------------------------------------
 * 📍 Page: Analyzer (Ad-hoc Analysis)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Provides a dedicated route (/analyzer) for one-off spec linting.
 * - Orchestrates the SpecStudio engine in a standalone workstation layout.
 * 
 * 📥 DATA FLOW:
 * - Purely volatile state managed within the SpecStudio feature store.
 * - Does not persist to drafts or products (used for "Sanity Checks").
 * - Can be hydrated via router state (e.g. from API Details "Analyze" button).
 * ------------------------------------------------------------------
 */
export function AnalyzerPage() {
    const { setPageTitle } = useStore();
    const { spec, setSpec } = useSpecStudio();
    const location = useLocation();

    // Check for incoming spec from navigation (e.g., "Analyze Spec" button)
    const incomingSpec = location.state?.startWithSpec;

    // effectiveContent: Prefer incoming navigation state, fallback to existing store state
    // This fixes the bug where navigating between APIs showed stale data
    const effectiveContent = incomingSpec || spec;

    useEffect(() => {
        setPageTitle('API Analyzer');
    }, [setPageTitle]);

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">
                <main className="flex-1 flex overflow-hidden relative">
                    <SpecStudio
                        initialContent={effectiveContent}
                        onContentChange={setSpec}
                    />
                </main>
                <div className="bg-slate-900 border-t border-slate-800 p-2 z-50 shrink-0">
                    <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest font-black">Spec Studio Engine</p>
                </div>
            </div>
        </MainLayout>
    );
}
