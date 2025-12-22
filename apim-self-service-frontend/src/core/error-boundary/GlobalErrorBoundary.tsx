import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
        this.setState({ error, errorInfo });
    }

    private handleRestart = () => {
        // Hard reload to clear any corrupt in-memory state
        window.location.href = '/';
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-slate-50 dark:bg-[#0f172a] flex items-center justify-center p-6 font-sans">
                    <div className="max-w-2xl w-full bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 dark:border-slate-800 animate-fade-in relative">

                        {/* Aesthetic Top Strip */}
                        <div className="h-2 w-full bg-gradient-to-r from-red-500 via-orange-500 to-red-500"></div>

                        <div className="p-10 md:p-14 text-center">
                            <div className="mb-8 relative inline-block">
                                <div className="absolute inset-0 bg-red-500/20 blur-2xl rounded-full"></div>
                                <div className="relative text-7xl animate-bounce-slow">💥</div>
                            </div>

                            <h1 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white mb-4 tracking-tight">
                                System Malfunction
                            </h1>

                            <p className="text-lg text-slate-600 dark:text-slate-400 mb-8 max-w-lg mx-auto leading-relaxed">
                                The application encountered a critical error and had to stop. This has been logged for our engineering team.
                            </p>

                            {/* Stack Trace Accordion (Collapsed Details) */}
                            <div className="mb-8 text-left">
                                <details className="group bg-slate-100 dark:bg-slate-950 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800">
                                    <summary className="px-6 py-4 cursor-pointer font-bold text-xs uppercase tracking-widest text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-900 transition flex items-center justify-between">
                                        <span>Technical Details</span>
                                        <span className="transform group-open:rotate-180 transition">▼</span>
                                    </summary>
                                    <div className="px-6 py-6 bg-slate-900 text-red-400 font-mono text-xs overflow-x-auto border-t border-slate-800">
                                        <p className="font-bold mb-2">{this.state.error?.toString()}</p>
                                        <pre className="opacity-70 whitespace-pre-wrap leading-relaxed">
                                            {this.state.errorInfo?.componentStack || 'No stack trace available.'}
                                        </pre>
                                    </div>
                                </details>
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
                                <button
                                    onClick={this.handleRestart}
                                    className="w-full md:w-auto px-8 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-xl font-black uppercase tracking-widest hover:scale-[1.02] shadow-xl hover:shadow-2xl transition-all"
                                >
                                    Restart Application
                                </button>
                                <a
                                    href="mailto:support@contoso.com"
                                    className="w-full md:w-auto px-8 py-4 bg-transparent text-slate-500 font-bold uppercase tracking-widest hover:text-slate-800 dark:hover:text-slate-200 transition"
                                >
                                    Contact Support
                                </a>
                            </div>
                        </div>

                        {/* Footer Aesthetic */}
                        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-center">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                APIM Self-Service Portal &bull; v2.4.0 &bull; Resilience Mode
                            </p>
                        </div>

                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
