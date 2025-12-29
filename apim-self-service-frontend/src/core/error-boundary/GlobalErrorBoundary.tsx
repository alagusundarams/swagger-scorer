import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Global Error Boundary
 * 
 * Catches unhandled exceptions in the component tree.
 */
export class GlobalErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
                    <div className="max-w-md w-full bg-white rounded-3xl p-12 shadow-2xl border border-red-100 flex flex-col items-center text-center">
                        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 text-3xl mb-8 animate-bounce">
                            ⚠️
                        </div>
                        <h1 className="text-2xl font-black text-gray-900 mb-4">Something went wrong</h1>
                        <p className="text-gray-500 font-medium mb-8">
                            An unexpected error occurred. Please try refreshing the page or contact support if the issue persists.
                        </p>
                        <button
                            onClick={() => window.location.reload()}
                            className="w-full py-5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-xl shadow-gray-200"
                        >
                            Reload Application
                        </button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
