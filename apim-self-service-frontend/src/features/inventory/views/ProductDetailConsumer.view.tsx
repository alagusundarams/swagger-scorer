import { useState, useCallback, useMemo } from 'react';
import type { Product, User, Subscription } from '../../../types/entities';
import { useStore } from '../../../store/useStore';

/**
 * Props for the ProductDetailConsumer component
 * 
 * @interface ProductDetailConsumerProps
 * @property {Product} product - The product being viewed
 * @property {User} user - Current authenticated user
 * @property {Subscription | null} subscription - Active subscription if any
 * @property {boolean} hasPendingRequest - Whether a request is currently pending
 * @property {() => void} onRequestAccess - Handler to open the access request modal
 */
interface ProductDetailConsumerProps {
    product: Product;
    user: User;
    subscription: Subscription | null;
    hasPendingRequest: boolean;
    onRequestAccess: () => void;
}

/**
 * ProductDetailConsumer Component
 * 
 * **Purpose**: Consumer-specific view for discovering and using API products.
 * 
 * **Key Features**:
 * - Discoverability: Clear API operation browsing
 * - Onboarding: "Getting Started" section with CURL examples for subscribers
 * - Subscription Status: Visual indicators for access levels
 * - Role-Based Content: Dynamic sections based on subscription state
 * 
 * **Aesthetics**: Premium, dark-mode friendly, high-contrast badges, and sleek interactions.
 * 
 * @component
 */
export const ProductDetailConsumer = ({
    product,
    subscription,
    hasPendingRequest,
    onRequestAccess
}: ProductDetailConsumerProps) => {
    // === Local State ===
    const [selectedEnv, setSelectedEnv] = useState<'DEV' | 'QA' | 'PROD'>('PROD');
    const [expandedApi, setExpandedApi] = useState<string | null>(null);

    // === Store Integration ===
    const { teams: allTeams } = useStore();

    // === Memoized Helpers ===
    const isSubscribed = useMemo(() => subscription?.state === 'active', [subscription]);

    const maskKey = useCallback((key: string) =>
        key.substring(0, 4) + '••••••••' + key.substring(key.length - 4),
        []);

    const activeTeam = useMemo(() =>
        allTeams.find(t => t.id === subscription?.subscriberTeamId),
        [allTeams, subscription]);

    return (
        <div className="max-w-7xl mx-auto px-6 py-8">
            {/* ============================================
                HEADER: Product Discovery & Primary Action
                ============================================ */}
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

            {/* ============================================
                GETTING STARTED: CURL & Connection Info
                ============================================ */}
            {isSubscribed && subscription && (
                <div className="bg-slate-900 text-white rounded-[2.5rem] p-10 mb-12 shadow-2xl border border-slate-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-600/20 rounded-full blur-[100px] pointer-events-none"></div>

                    <div className="relative z-10 flex flex-col lg:flex-row gap-12">
                        {/* URL & Curl Section */}
                        <div className="flex-1">
                            <h3 className="text-xl font-black uppercase tracking-widest mb-8 flex items-center gap-3">
                                <span className="bg-emerald-600 p-2 rounded-lg">🚀</span>
                                Getting Started
                            </h3>

                            <div className="space-y-6">
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Gateway Endpoint ({selectedEnv})</p>
                                    <div className="flex bg-black/40 p-4 rounded-xl border border-white/5 font-mono text-sm text-emerald-400 group">
                                        <code className="truncate">
                                            https://api.{selectedEnv.toLowerCase() === 'prod' ? 'ionosphere' : selectedEnv.toLowerCase() + '.ionosphere'}.io/v{product.version}
                                        </code>
                                        <button className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white">
                                            📋
                                        </button>
                                    </div>
                                </div>

                                <div className="p-6 bg-black/20 rounded-2xl border border-white/5 relative group/code">
                                    <p className="text-xs font-bold text-slate-400 mb-4">Sample CURL Request</p>
                                    <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                                        {`curl -X GET "https://api.ionosphere.io/v${product.version}/metadata" \\
  -H "Ocp-Apim-Subscription-Key: ${maskKey(subscription.primaryKey.value)}" \\
  -H "Content-Type: application/json"`}
                                    </pre>
                                    <button
                                        onClick={() => navigator.clipboard.writeText(`curl -X GET "https://api.ionosphere.io/v${product.version}/metadata" -H "Ocp-Apim-Subscription-Key: ${subscription.primaryKey.value}" -H "Content-Type: application/json"`)}
                                        className="absolute top-4 right-4 p-2 bg-white/5 hover:bg-white/10 rounded-lg transition-all opacity-0 group-hover/code:opacity-100 text-slate-400 hover:text-white"
                                        title="Copy CURL"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Connection Selector */}
                        <div className="lg:w-1/3 flex flex-col gap-6">
                            <div className="p-6 bg-white/5 rounded-2xl border border-white/5 mb-4">
                                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Select Environment</h4>
                                <div className="space-y-2">
                                    {(['DEV', 'QA', 'PROD'] as const).map(env => (
                                        <button
                                            key={env}
                                            onClick={() => setSelectedEnv(env)}
                                            className={`w-full text-left px-4 py-3 rounded-xl transition-all font-bold text-sm ${selectedEnv === env
                                                ? 'bg-emerald-600 text-white shadow-lg'
                                                : 'text-slate-400 hover:bg-white/5'
                                                }`}
                                        >
                                            {env} Environment
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================
                API CATALOG: Direct Interface Discovery
                ============================================ */}
            <div className="mb-12">
                <div className="flex items-center gap-4 mb-8">
                    <div className="w-1 h-8 bg-emerald-600 rounded-full"></div>
                    <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest">Interface Catalog</h2>
                </div>

                <div className="grid grid-cols-1 gap-6">
                    {product.apis.map((api) => {
                        const isExpanded = expandedApi === api.id;
                        return (
                            <div
                                key={api.id}
                                className={`bg-white dark:bg-slate-800 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700/30 overflow-hidden transition-all duration-300 ${isExpanded ? 'ring-2 ring-emerald-500/20' : 'hover:border-emerald-100 dark:hover:border-emerald-900/30'}`}
                            >
                                <div
                                    className="p-8 flex items-center justify-between cursor-pointer"
                                    onClick={() => setExpandedApi(isExpanded ? null : api.id)}
                                >
                                    <div className="flex items-center gap-8">
                                        <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-900/10 rounded-2xl flex items-center justify-center text-xl">
                                            📡
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black text-gray-900 dark:text-white mb-1">
                                                {api.displayName}
                                            </h3>
                                            <p className="text-sm text-gray-400 font-medium">
                                                Base Path: <code className="text-emerald-500 font-mono italic">{api.path || '/'}</code>
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-8">
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest mb-1">Endpoints</p>
                                            <span className="text-sm font-bold text-gray-500">{api.operations.length} Managed</span>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center transition-transform duration-300 ${isExpanded ? 'rotate-180 bg-emerald-50 border-emerald-200 text-emerald-600' : 'text-gray-300'}`}>
                                            ↓
                                        </div>
                                    </div>
                                </div>

                                {isExpanded && (
                                    <div className="px-8 pb-8 bg-gray-50 dark:bg-slate-900/50 border-t border-gray-50 dark:border-slate-700/30 animate-fade-in">
                                        <div className="pt-6 space-y-4">
                                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Available Operations</h4>
                                            {api.operations.map((op, idx) => (
                                                <div key={idx} className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-xl border border-gray-100 dark:border-slate-700/30">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-tighter ${op.method === 'GET' ? 'bg-blue-100 text-blue-600' :
                                                        op.method === 'POST' ? 'bg-green-100 text-green-600' :
                                                            'bg-amber-100 text-amber-600'
                                                        }`}>
                                                        {op.method}
                                                    </span>
                                                    <span className="text-sm font-mono text-gray-700 dark:text-slate-300">{op.urlTemplate || '/'}</span>
                                                    <div className="ml-auto text-xs text-gray-400 font-medium italic truncate max-w-[300px] flex items-center gap-2">
                                                        <span>{op.displayName || 'No description'}</span>
                                                        <span className="p-1 hover:bg-gray-100 dark:hover:bg-slate-700 rounded transition-colors cursor-help" title="View details">ℹ️</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ============================================
                COMPLIANCE & GOVERNANCE: Terms and Standing
                ============================================ */}
            {isSubscribed && (
                <div className="bg-white dark:bg-slate-800 rounded-[2rem] p-10 border border-gray-100 dark:border-slate-700/30 shadow-sm mb-12 animate-fade-in">
                    <div className="flex flex-col md:flex-row gap-12 text-sm">
                        <div className="flex-1">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6 flex items-center gap-2">
                                <span className="text-emerald-500">⚖️</span> Compliance Status
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-800/30">
                                    <span className="font-bold text-emerald-800 dark:text-emerald-400">Governance Standing</span>
                                    <span className="bg-emerald-500 text-white text-[8px] font-black uppercase px-2 py-1 rounded">Good</span>
                                </div>
                                <p className="text-gray-500 dark:text-slate-400 font-medium leading-relaxed">
                                    Your team (<span className="text-gray-900 dark:text-slate-100 font-bold">{activeTeam?.name}</span>) is currently in full compliance with the terms of this API Product.
                                </p>
                            </div>
                        </div>

                        <div className="flex-1 border-t md:border-t-0 md:border-l border-gray-100 dark:border-slate-700/50 pt-12 md:pt-0 md:pl-12">
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-6">Terms of Usage</h3>
                            <ul className="space-y-3 text-gray-500 dark:text-slate-400 font-medium list-disc list-inside">
                                <li>Access is granted for internal development use only.</li>
                                <li>Rate limits of 1000 req/sec apply globally.</li>
                                <li>Production usage requires specific PII clearance.</li>
                                <li>Owner reserves the right to revoke access with 48h notice.</li>
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
