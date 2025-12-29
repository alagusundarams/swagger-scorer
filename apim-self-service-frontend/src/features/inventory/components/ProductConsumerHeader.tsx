import { type Product } from '../../../types/entities';
import { type Team } from '../../teams/types/teamTypes';

interface ProductConsumerHeaderProps {
    product: Product;
    isSubscribed: boolean;
    activeTeam?: Team;
    hasPendingRequest: boolean;
    onRequestAccess: () => void;
}

export function ProductConsumerHeader({
    product,
    isSubscribed,
    activeTeam,
    hasPendingRequest,
    onRequestAccess
}: ProductConsumerHeaderProps) {
    return (
        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-10 mb-12 shadow-premium border border-gray-100 dark:border-slate-700/30">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-emerald-600 rounded-3xl flex items-center justify-center text-white text-3xl shadow-xl shadow-emerald-500/20">
                        🔍
                    </div>
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight">
                                {product.displayName}
                            </h1>
                            <span className="bg-gray-50 dark:bg-slate-900 px-3 py-1 rounded-lg text-xs font-black text-gray-400 uppercase tracking-widest border border-gray-100 dark:border-slate-800">
                                V{product.version}
                            </span>
                        </div>
                        <p className="text-gray-500 dark:text-slate-400 text-lg max-w-2xl font-medium">
                            {product.description}
                        </p>
                    </div>
                </div>

                <div className="shrink-0 w-full md:w-auto">
                    {isSubscribed ? (
                        <div className="flex items-center gap-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 font-bold px-8 py-5 rounded-2xl border border-emerald-100 dark:border-emerald-800/50">
                            <span className="text-xl">✅</span> Active Access via {activeTeam?.name || 'Your Team'}
                        </div>
                    ) : (
                        <button
                            disabled={hasPendingRequest}
                            onClick={onRequestAccess}
                            className={`w-full md:w-auto font-black text-[10px] uppercase tracking-[0.2em] py-5 px-10 rounded-2xl transition-all shadow-xl hover:scale-[1.02] ${hasPendingRequest
                                ? 'bg-amber-50 text-amber-600 cursor-not-allowed border border-amber-100'
                                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-500/20'
                                }`}
                        >
                            {hasPendingRequest ? '⌛ Request Pending Review' : '🚀 Request Integration Access'}
                        </button>
                    )}
                </div>
            </div>

            {/* Metadata Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10 pt-10 border-t border-gray-50 dark:border-slate-700/30">
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">API Documentation</p>
                    <span className="text-sm font-bold text-gray-700 dark:text-white flex items-center gap-1.5">
                        <span className="text-emerald-500">✓</span> OpenAPI 3.0 Verified
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Support Level</p>
                    <span className="text-sm font-bold text-gray-700 dark:text-white flex items-center gap-1.5">
                        <span className="text-blue-500">●</span> 24/7 Enterprise Support
                    </span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Avg. Latency</p>
                    <span className="text-sm font-bold text-gray-700 dark:text-white">~45ms</span>
                </div>
                <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Stability</p>
                    <span className="text-sm font-bold text-emerald-500 uppercase tracking-widest">99.99% UP</span>
                </div>
            </div>
        </div>
    );
}
