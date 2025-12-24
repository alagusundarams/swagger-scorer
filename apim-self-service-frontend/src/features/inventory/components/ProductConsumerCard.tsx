import React from 'react';
import { type Product, type Subscription } from '../../../types/entities';
import '../inventory.css';

interface ProductConsumerCardProps {
    product: Product & { subscription: Subscription };
    isRevealed: boolean;
    onToggleReveal: () => void;
    onCopyKey: (key: string) => void;
    onClick?: () => void;
}

/**
 * ProductConsumerCard - Premium card for the Consumer View of the Dashboard.
 * Focuses on Access Management (Keys), Upstream Health, and Ownership.
 */
export const ProductConsumerCard: React.FC<ProductConsumerCardProps> = ({
    product,
    isRevealed,
    onToggleReveal,
    onCopyKey,
    onClick,
}) => {
    const { subscription } = product;

    // Helper to mask keys
    const maskKey = (key: string) => key.substring(0, 4) + '••••••••' + key.substring(key.length - 4);

    return (
        <div
            className="group bg-white dark:bg-slate-800/90 rounded-3xl shadow-premium border border-gray-100 dark:border-slate-700/50 overflow-hidden hover:shadow-premium-hover transition-all duration-500 transform hover:-translate-y-2 cursor-pointer flex flex-col"
            onClick={onClick}
        >
            <div className="p-7 flex-1">
                <div className="flex justify-between items-start mb-6">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2">
                            <h3 className="text-xl font-black text-gray-900 dark:text-white truncate group-hover:text-blue-500 transition-colors tracking-tight">
                                {product.displayName}
                            </h3>
                            <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase tracking-widest">
                                {subscription.state}
                            </span>
                        </div>
                        <p className="text-xs font-semibold text-gray-400 dark:text-slate-500 line-clamp-2 leading-relaxed">
                            {product.description}
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-1 ml-4">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest">Ownership</div>
                        <div className="text-[10px] font-bold text-gray-700 dark:text-slate-300 bg-gray-100 dark:bg-slate-700/50 px-2 py-1 rounded-md">
                            {product.ownerTeamId}
                        </div>
                    </div>
                </div>

                {/* Consumer-Specific Widget: Key Management */}
                <div className="bg-gray-50/50 dark:bg-slate-900/50 p-5 rounded-2xl border border-gray-100 dark:border-slate-700/30 mb-6 group-hover:border-blue-500/20 transition-colors">
                    <div className="flex justify-between items-center mb-3">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest">Primary Subscription Key</div>
                        <div className="flex gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggleReveal(); }}
                                className="text-xs opacity-60 hover:opacity-100 transition-opacity"
                                title={isRevealed ? "Hide Key" : "Reveal Key"}
                            >
                                {isRevealed ? '👁️' : '👁️‍🗨️'}
                            </button>
                            <button
                                onClick={(e) => { e.stopPropagation(); onCopyKey(subscription.primaryKey.value); }}
                                className="text-xs text-blue-500 hover:text-blue-600 transition-colors"
                                title="Copy Key"
                            >
                                📋
                            </button>
                        </div>
                    </div>
                    <div className="font-mono text-xs tracking-widest text-gray-600 dark:text-slate-300 break-all bg-white dark:bg-slate-950/50 p-3 rounded-xl border border-gray-100 dark:border-slate-800 shadow-inner">
                        {isRevealed ? subscription.primaryKey.value : maskKey(subscription.primaryKey.value)}
                    </div>
                </div>

                {/* Health & Performance (Mocked for Phase 2) */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest">Avg Latency</div>
                        <div className="flex items-center gap-2">
                            <div className="health-meter-container">
                                <div className="health-meter-fill latency" style={{ width: '85%' }} />
                            </div>
                            <span className="text-[10px] font-black text-emerald-500">124ms</span>
                        </div>
                    </div>
                    <div className="flex flex-col gap-1">
                        <div className="text-[9px] uppercase font-black text-gray-400 dark:text-slate-500 tracking-widest">SLA Uptime</div>
                        <div className="flex items-center gap-2">
                            <div className="health-meter-container">
                                <div className="health-meter-fill uptime" style={{ width: '99%' }} />
                            </div>
                            <span className="text-[10px] font-black text-blue-500">99.9%</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Environment & Metadata Footer */}
            <div className="px-7 py-4 border-t border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 backdrop-blur-sm flex justify-between items-center">
                <span className="px-2 py-0.5 text-[9px] font-black rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 uppercase tracking-widest">
                    {product.environment}
                </span>
                <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest hover:underline">
                    Usage Guide →
                </div>
            </div>
        </div>
    );
};
