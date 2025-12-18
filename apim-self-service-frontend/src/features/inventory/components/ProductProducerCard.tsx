import React from 'react';
import { type Product } from '../../../types/entities';

interface ProductProducerCardProps {
    product: Product;
    onClick?: () => void;
}

/**
 * ProductProducerCard - Premium card for the Producer View of the Dashboard.
 * Focuses on Adoption (Subscribers), Complexity (API Count), and Governance (Score).
 */
export const ProductProducerCard: React.FC<ProductProducerCardProps> = ({
    product,
    onClick,
}) => {
    const score = product.qualityScore || 0;

    // Color logic for score
    const getScoreColor = (s: number) => {
        if (s >= 90) return 'text-green-500 stroke-green-500';
        if (s >= 70) return 'text-amber-500 stroke-amber-500';
        return 'text-red-500 stroke-red-500';
    };

    const scoreClass = getScoreColor(score);
    const strokeDasharray = `${score}, 100`;

    return (
        <div
            className="group bg-white dark:bg-slate-800/90 rounded-2xl shadow-premium border border-gray-100 dark:border-slate-700/50 overflow-hidden hover:shadow-premium-hover transition-all duration-500 transform hover:-translate-y-2 cursor-pointer flex flex-col"
            onClick={onClick}
        >
            <div className="p-7 flex-1">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors tracking-tight">
                                {product.displayName}
                            </h3>
                            {product.identity && (
                                <div className="bg-blue-500/10 p-1 rounded-md text-blue-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                </div>
                            )}
                        </div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                            {product.description}
                        </p>
                    </div>

                    {/* Premium Score Gauge */}
                    <div className="relative h-20 w-20 flex-shrink-0 ml-4 group/chart">
                        <svg className="h-full w-full -rotate-90 transform-gpu transition-transform duration-700 group-hover/chart:scale-110" viewBox="0 0 36 36">
                            <circle
                                className="stroke-gray-50 dark:stroke-slate-700/50"
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                strokeWidth="3"
                            />
                            <circle
                                className={`transition-all duration-1000 ease-out ${scoreClass.split(' ')[1]}`}
                                cx="18"
                                cy="18"
                                r="16"
                                fill="none"
                                strokeWidth="3"
                                strokeDasharray={strokeDasharray}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div className={`absolute inset-0 flex flex-col items-center justify-center ${scoreClass.split(' ')[0]}`}>
                            <span className="text-sm font-black tracking-tighter">{score}%</span>
                            <span className="text-[8px] uppercase opacity-60 font-black tracking-widest">Score</span>
                        </div>
                    </div>
                </div>

                {/* Grid Metrics */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/30 transition-colors group-hover:border-blue-500/20">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 mb-1 tracking-widest">Adoption</div>
                        <div className="flex items-baseline gap-1">
                            <div className="text-lg font-black text-gray-900 dark:text-white">{product.subscriberCount || 0}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">subs</div>
                        </div>
                    </div>
                    <div className="bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-2xl border border-gray-100 dark:border-slate-700/30 transition-colors group-hover:border-blue-500/20">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 mb-1 tracking-widest">Interfaces</div>
                        <div className="flex items-baseline gap-1">
                            <div className="text-lg font-black text-gray-900 dark:text-white">{product.apis.length}</div>
                            <div className="text-[10px] text-gray-400 dark:text-slate-500 font-bold">APIs</div>
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-1 text-[9px] font-black rounded-lg border uppercase tracking-wider ${product.environment === 'PROD'
                        ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                        }`}>
                        {product.environment}
                    </span>
                </div>
            </div>

            <div className="border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm">
                <button
                    onClick={(e) => { e.stopPropagation(); onClick?.(); }}
                    className="w-full py-4 text-[10px] font-black text-gray-500 dark:text-slate-400 hover:text-blue-500 uppercase tracking-widest transition-all hover:bg-white dark:hover:bg-slate-700/50"
                >
                    View Details
                </button>
            </div>
        </div>
    );
};
