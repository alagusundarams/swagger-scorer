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
}

export function ApiIdentityHeader({ product, api }: ApiIdentityHeaderProps) {
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
                        <h1 className="text-5xl font-black text-gray-900 dark:text-white tracking-tighter leading-none">
                            {api.displayName}
                        </h1>
                        <button
                            onClick={handleAnalyze}
                            className="px-8 py-4 bg-slate-900 dark:bg-slate-800 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl shadow-xl hover:scale-105 transition-all flex items-center gap-2 border border-slate-700"
                        >
                            <span className="text-lg">⚡</span> Analyze Spec
                        </button>
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
                        <div className="flex items-center gap-2 group">
                            <code className="text-sm font-mono bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-lg text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 select-all">
                                {`https://api-${(product.environment || 'dev').toLowerCase()}.contoso.com${api.path}`}
                            </code>
                            <button
                                onClick={() => {
                                    navigator.clipboard.writeText(`https://api-${(product.environment || 'dev').toLowerCase()}.contoso.com${api.path}`);
                                    alert('URL copied!');
                                }}
                                className="p-2 text-gray-400 hover:text-blue-600 transition opacity-0 group-hover:opacity-100"
                                title="Copy to clipboard"
                            >
                                📋
                            </button>
                        </div>
                    </div>

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
