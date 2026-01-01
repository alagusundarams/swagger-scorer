import { useEffect } from 'react';
import { useStore } from '../../store/useStore';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { SpecStudio, useSpecStudio } from '../../features/spec-studio';

/**
 * AnalyzerPage Controller
 * 
 * Now uses the unified SpecStudio engine.
 */
export function AnalyzerPage() {
    const { setPageTitle } = useStore();
    const { spec, setSpec } = useSpecStudio();

    useEffect(() => {
        setPageTitle('API Analyzer');
    }, [setPageTitle]);

    return (
        <MainLayout>
            <div className="absolute inset-0 flex flex-col overflow-hidden bg-slate-950">
                <main className="flex-1 flex overflow-hidden relative">
                    <SpecStudio
                        initialContent={spec}
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
