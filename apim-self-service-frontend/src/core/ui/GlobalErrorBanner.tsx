import React from 'react';
import type { GlobalError } from '../../types/notifications';

interface GlobalErrorBannerProps {
    error: GlobalError;
    onDismiss: () => void;
}

export const GlobalErrorBanner: React.FC<GlobalErrorBannerProps> = ({ error, onDismiss }) => {
    return (
        <div className={`w-full px-6 py-3 flex items-center justify-between animate-fade-in ${error.severity === 'error' ? 'bg-red-50 border-b-2 border-red-500' :
            error.severity === 'warning' ? 'bg-amber-50 border-b-2 border-amber-500' :
                'bg-blue-50 border-b-2 border-blue-500'
            }`}>
            <div className="flex items-center gap-3">
                {/* Icon */}
                <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${error.severity === 'error' ? 'bg-red-500 text-white' :
                    error.severity === 'warning' ? 'bg-amber-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {error.severity === 'error' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    ) : error.severity === 'warning' ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    ) : (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                    )}
                </div>

                {/* Message */}
                <div>
                    <p className={`text-sm font-semibold ${error.severity === 'error' ? 'text-red-900' :
                        error.severity === 'warning' ? 'text-amber-900' :
                            'text-blue-900'
                        }`}>
                        {error.message}
                    </p>
                    {error.source && (
                        <p className="text-xs text-gray-600 mt-0.5">
                            Source: <span className="font-medium">{error.source}</span>
                        </p>
                    )}
                </div>
            </div>

            {/* Dismiss button */}
            {error.dismissible && (
                <button
                    onClick={onDismiss}
                    className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${error.severity === 'error' ? 'text-red-700 hover:bg-red-100' :
                        error.severity === 'warning' ? 'text-amber-700 hover:bg-amber-100' :
                            'text-blue-700 hover:bg-blue-100'
                        }`}
                >
                    Dismiss
                </button>
            )}
        </div>
    );
};
