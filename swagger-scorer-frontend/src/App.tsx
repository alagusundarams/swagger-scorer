import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AnalyzerForm } from './components/AnalyzerForm';
import { ScoreCard } from './components/ScoreCard';
import { ViolationsTable } from './components/ViolationsTable';
import { useAnalysis } from './store/useAnalysis';

function App() {
  const { result, isMaximized } = useAnalysis();

  return (
    <div className="h-screen w-screen flex flex-col bg-corp-bg text-corp-text-primary overflow-hidden font-sans">
      {/* Main Content Area (Split Pane) */}
      <div className="flex-grow flex overflow-hidden">
        {/* Left Pane: Editor */}
        <div className={`flex flex-col transition-all duration-300 ease-in-out ${isMaximized ? 'w-full' : 'w-[55%]'} border-r border-corp-border bg-white z-10 shadow-sm`}>
          <Header />
          <main className="flex-grow flex flex-col relative overflow-hidden">
            <AnalyzerForm />
          </main>
        </div>

        {/* Right Pane: Results (Hidden if Maximized) */}
        {!isMaximized && (
          <div className="w-[45%] flex flex-col bg-slate-50/80 overflow-hidden z-0">
            <div className="h-full overflow-y-auto custom-scrollbar p-8">
              {result ? (
                <div className="animate-fade-in space-y-6">
                  <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 bg-blue-100 rounded-lg text-blue-600">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 002 2h2a2 2 0 002-2z" /></svg>
                      </div>
                      <h2 className="text-xl font-bold text-gray-800 tracking-tight">Analysis Report</h2>
                    </div>
                    <span className="text-xs font-medium text-gray-500 bg-white px-2 py-1 rounded border border-gray-200 shadow-sm">
                      Last run: Just now
                    </span>
                  </div>
                  <ScoreCard />
                  <ViolationsTable />
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 space-y-4">
                  <div className="w-20 h-20 rounded-2xl bg-white border border-dashed border-gray-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.384-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
                    </svg>
                  </div>
                  <div className="text-center max-w-sm">
                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Ready to Analyze</h3>
                    <p className="text-xs text-gray-500">
                      Your results will appear here in a structured data grid.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}

export default App;
