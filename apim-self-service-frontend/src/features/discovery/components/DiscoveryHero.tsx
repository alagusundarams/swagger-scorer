import React from 'react';
import { Link } from 'react-router-dom';

interface DiscoveryHeroProps {
    searchQuery: string;
    onSearchChange: (value: string) => void;
}

export const DiscoveryHero: React.FC<DiscoveryHeroProps> = ({ searchQuery, onSearchChange }) => {
    return (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/60 transition-all">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-6">
                    <div>
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter mb-2">Discovery Hub</h1>
                        <p className="text-gray-400 dark:text-slate-500 text-lg font-medium">Explore and integrate with high-quality API assets</p>
                    </div>
                    <Link
                        to="/"
                        className="px-6 py-4 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 text-gray-600 dark:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:shadow-premium transition-all shrink-0"
                    >
                        ← Back to Dashboard
                    </Link>
                </div>

                {/* Filter Input */}
                <div className="relative group max-w-4xl">
                    <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-2xl group-focus-within:scale-110 transition-transform">
                        🔍
                    </div>
                    <input
                        type="search"
                        placeholder="Find by name, capability, or owner..."
                        value={searchQuery}
                        onChange={e => onSearchChange(e.target.value)}
                        className="w-full pl-16 pr-8 py-6 bg-gray-50 dark:bg-slate-800 border border-transparent dark:border-slate-700/50 rounded-3xl text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-8 focus:ring-blue-500/5 transition-all shadow-inner text-lg font-medium"
                    />
                </div>
            </div>
        </div>
    );
};
