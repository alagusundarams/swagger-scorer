/**
 * ApiIdentityHeader
 * 
 * Displays the key identity information for a specific API, including its name, version, and type.
 * Used at the top of the API Detail view.
 */
import { Link, useNavigate } from 'react-router-dom';
import { type API, type Product } from '../../types/inventoryTypes';
import { getEnvironmentTheme } from '../../../../utils/statusUtils';

interface ApiIdentityHeaderProps {
    product: Product;
    api: API;
    canEditPolicies?: boolean;
}

export function ApiIdentityHeader({ product, api, canEditPolicies = false }: ApiIdentityHeaderProps) {
    const navigate = useNavigate();

    const handleAnalyze = () => {
        const breadcrumbContext = [
            { label: product.displayName, href: `/products/${product.id}` },
            { label: api.displayName, href: `/products/${product.id}/apis/${api.id}` }
        ];

        const navState = {
            startWithSpec: `openapi: 3.0.0
info:
  title: ${api.displayName}
  version: 1.0.0
paths: {}
# Loaded from Product Inventory
`,
            breadcrumbContext
        };

        // Persist breadcrumbs for browser refresh
        sessionStorage.setItem('analyzerBreadcrumbs', JSON.stringify(breadcrumbContext));
        navigate('/analyzer', { state: navState });
    };

    return (
        <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/50 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-12">
                <div>
                    <div className="flex items-center gap-4 mb-6">
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.2em] bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-lg border border-blue-100 dark:border-blue-900/40">
                            ⚡ API RESOURCE NODE
                        </span>
                    </div>
                    <div className="flex justify-between items-end mb-6">
                        <div className="flex flex-col gap-2">
                            <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                                {api.displayName}
                            </h1>
                            {api.identity && (
                                <div className="flex items-center gap-3 mt-2">
                                    <span className={`text-[9px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border ${api.identity.type === 'PRODUCT'
                                        ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                                        : 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800'
                                        }`}>
                                        {api.identity.type === 'PRODUCT' ? '🛡️ Shared Identity' : '🔐 Isolated Identity'}
                                    </span>
                                    <code className="text-xs font-mono text-gray-400 dark:text-slate-500 bg-gray-50 dark:bg-slate-800/50 px-2 py-0.5 rounded border border-gray-100 dark:border-slate-700">
                                        {api.identity.clientId}
                                    </code>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            {canEditPolicies && (
                                <button
                                    onClick={() => navigate(`/products/${product.id}/apis/${api.id}/policy-editor`)}
                                    className="px-6 py-4 bg-purple-600/10 text-purple-600 hover:bg-purple-600 hover:text-white font-black text-[10px] uppercase tracking-widest rounded-2xl transition-all flex items-center gap-2 border border-purple-200 dark:border-purple-800"
                                >
                                    <span className="text-lg">🛠️</span> Edit Policies
                                </button>
                            )}
                            <button
                                onClick={handleAnalyze}
                                className="px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-slate-700"
                            >
                                <span className="text-lg">⚡</span> Analyze Spec
                            </button>
                        </div>
                    </div>
                    <div className="text-gray-500 dark:text-slate-400 text-lg max-w-3xl leading-relaxed font-medium">
                        {api.description || (
                            <span className="flex items-center gap-2 p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-800/30 rounded-xl text-amber-700 dark:text-amber-500 text-sm font-bold">
                                ⚠️ Governance Alert: This interface lacks a functional description. Please update the registry metadata.
                            </span>
                        )}
                    </div>

                    {/* Invocation URL Display */}
                    <div className="mt-8 mb-2">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Invocation URL</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${getEnvironmentTheme(product.environment || '').bg} ${getEnvironmentTheme(product.environment || '').text} ${getEnvironmentTheme(product.environment || '').border}`}>{product.environment || 'DEV'}</span>
                        </div>
                        <div className="flex items-center gap-3 group">
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 border border-slate-200 dark:border-slate-700 transition-all group-hover:border-blue-300 dark:group-hover:border-blue-900 shadow-sm">
                                <code className="text-sm font-mono text-slate-600 dark:text-slate-300 select-all">
                                    {api.gatewayUrl || `https://api-${(product.environment || 'dev').toLowerCase()}.ionosphere.io${api.path}`}
                                </code>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(api.gatewayUrl || `https://api-${(product.environment || 'dev').toLowerCase()}.ionosphere.io${api.path}`);
                                    }}
                                    className="ml-4 p-2 text-slate-400 hover:text-blue-600 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-all"
                                    title="Copy to clipboard"
                                >
                                    📋
                                </button>
                            </div>
                            <span className="text-[10px] font-black text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity uppercase tracking-tighter">
                                Click to Copy
                            </span>
                        </div>
                    </div>

                    {/* Backend Implementation URL */}
                    {api.serviceUrl && (
                        <div className="mt-4 mb-2">
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Backend Implementation Node</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold border uppercase bg-amber-50 text-amber-600 border-amber-100">Live Backend</span>
                            </div>
                            <div className="flex items-center gap-3 group">
                                <div className="flex items-center bg-amber-50/30 dark:bg-amber-900/10 rounded-xl px-4 py-3 border border-amber-100 dark:border-amber-900/30 transition-all group-hover:border-amber-300 dark:group-hover:border-amber-700 shadow-sm">
                                    <code className="text-sm font-mono text-amber-900/70 dark:text-amber-400/70 select-all italic">
                                        {api.serviceUrl}
                                    </code>
                                    <button
                                        onClick={() => {
                                            navigator.clipboard.writeText(api.serviceUrl || '');
                                        }}
                                        className="ml-4 p-2 text-amber-400 hover:text-amber-600 hover:bg-white dark:hover:bg-amber-900/30 rounded-lg transition-all"
                                        title="Copy to clipboard"
                                    >
                                        📋
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Deployment Context */}
                    <div className="flex flex-wrap items-center gap-8 mt-10 p-6 bg-gray-50/50 dark:bg-slate-800/40 rounded-[2rem] border border-gray-100 dark:border-slate-700/30">
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Base Routing Path</span>
                            <span className="font-mono text-sm font-black text-blue-600 dark:text-blue-400">
                                {api.path || <span className="text-red-500">UNASSIGNED_ROUTE</span>}
                            </span>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-slate-700/50 hidden md:block"></div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Endpoint Density</span>
                            <span className="text-sm font-black text-gray-900 dark:text-white">{api.operations.length} Managed Operations</span>
                        </div>
                        <div className="w-px h-8 bg-gray-200 dark:bg-slate-700/50 hidden md:block"></div>
                        <div className="flex flex-col gap-1">
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Parent Product</span>
                            <Link to={`/products/${product.id}`} className="text-sm font-black text-gray-900 dark:text-white hover:text-blue-600 transition-colors underline decoration-gray-200 underline-offset-4">
                                {product.displayName}
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
