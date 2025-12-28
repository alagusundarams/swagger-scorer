import { useEffect } from 'react';
import { useAnalysis } from '../store/useAnalysis';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { AnalyzerForm } from '../components/AnalyzerForm';
import { ScoreCard } from '../components/ScoreCard';
import { ViolationsTable } from '../components/ViolationsTable';
import '../analyzer.css';

export function AnalyzerPage() {
    const { isMaximized } = useAnalysis();
    const { setPageTitle } = useInventoryStore();

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
