import React, { type ReactNode } from 'react';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    children?: ReactNode;
}

export const Header: React.FC<HeaderProps> = () => {
    return (
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in px-6 py-4 bg-white border-b border-corp-border shrink-0 z-20 sticky top-0 h-16">
            {/* Title / Brand */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">Swagger Scorer</h1>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">Enterprise Quality Gate</p>
                </div>
            </div>
        </header>
    );
};
