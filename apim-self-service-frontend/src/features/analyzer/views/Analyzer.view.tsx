import { useEffect } from 'react';
import { useAnalysis } from '../store/useAnalysis';
import { useStore } from '../../../store/useStore';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { AnalyzerForm } from '../components/AnalyzerForm';
import { ScoreCard } from '../components/ScoreCard';
import { ViolationsTable } from '../components/ViolationsTable';
import '../analyzer.css';

export function AnalyzerPage() {
    const { isMaximized } = useAnalysis();
    const { setPageTitle } = useStore();

    useEffect(() => {
        setPageTitle('API Analyzer');
    }, [setPageTitle]);

    return (
        <MainLayout>
            <main className="h-[calc(100vh-130px)] flex flex-col overflow-hidden relative">
                <div className="flex h-full">
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
                </div>
            </main>
            <div className="bg-slate-900 border-t border-slate-700 p-2 z-50">
                <p className="text-center text-[10px] text-slate-500 uppercase tracking-widest">Analyzer Mode</p>
            </div>
        </MainLayout>
    );
}
