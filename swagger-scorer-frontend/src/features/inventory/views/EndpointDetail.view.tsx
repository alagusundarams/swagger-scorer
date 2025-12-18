import { useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';

/**
 * EndpointDetailPage: Deep-dive into a specific API Operation.
 * 
 * CAPABILITIES:
 * - Technical details (Request/Response schemas)
 * - Method-specific visual cues
 * - Sandbox integration (Planned)
 * - store-isolated data hierarchy resolution
 */

export const EndpointDetailPage = () => {
    const { productId, apiId, operationId } = useParams<{ productId: string; apiId: string; operationId: string }>();
    const navigate = useNavigate();

    // --- Store Integration ---
    const { products } = useStore();

    // --- Data Selectors (Hierarchical Resolution) ---
    const product = useMemo(() => products.find(p => p.id === productId), [products, productId]);
    const api = useMemo(() => product?.apis.find(a => a.id === apiId), [product, apiId]);
    const operation = useMemo(() => api?.operations.find(o => o.id === operationId), [api, operationId]);

    // Handle missing data
    if (!product || !api || !operation) {
        return (
            <MainLayout>
                <div className="max-w-7xl mx-auto px-6 py-20 text-center">
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white mb-4 uppercase tracking-tighter">Endpoint not located</h1>
                    <button
                        onClick={() => navigate('/')}
                        className="px-8 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl"
                    >
                        Back to Control Center
                    </button>
                </div>
            </MainLayout>
        );
    }

    // Method Branding Configuration
    const methodTheme = {
        GET: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800',
        POST: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800',
        PUT: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800',
        PATCH: 'bg-violet-50 text-violet-600 border-violet-100 dark:bg-violet-900/20 dark:border-violet-800',
        DELETE: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:border-rose-800',
    };

    return (
        <MainLayout>
            {/* Contextual Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-gray-100 dark:border-slate-800/50">
                <div className="max-w-7xl mx-auto px-6 py-12">
                    <div className="flex flex-col md:flex-row items-start md:items-center gap-8">
                        <span className={`w-24 h-24 flex items-center justify-center rounded-[2rem] text-2xl font-black border-2 shadow-sm shrink-0 ${methodTheme[operation.method]}`}>
                            {operation.method}
                        </span>
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <span className="text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest bg-gray-50 dark:bg-slate-800/50 px-3 py-1 rounded-lg">
                                    Managed Operation
                                </span>
                            </div>
                            <h1 className="text-4xl font-mono font-black text-gray-900 dark:text-white tracking-tight mb-4">
                                {operation.urlTemplate}
                            </h1>
                            <p className="text-gray-500 dark:text-slate-400 text-lg font-medium max-w-3xl leading-relaxed">
                                {operation.description}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Technical Detail Manifest */}
            <main className="max-w-7xl mx-auto px-6 py-14">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">

                    {/* Column 1: Request Specification */}
                    <div className="space-y-10">
                        <section className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/30 shadow-sm transition-all hover:shadow-premium">
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                                <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Request Definition
                            </h2>

                            <div className="space-y-8">
                                <div>
                                    <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Invocation URI</h3>
                                    <div className="bg-gray-50 dark:bg-slate-900 p-5 rounded-2xl font-mono text-sm border border-gray-100 dark:border-slate-800">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-gray-400 w-16 text-[9px] uppercase font-bold">Mount:</span>
                                            <span className="text-blue-600 font-bold">{api.path}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-gray-400 w-16 text-[9px] uppercase font-bold">Path:</span>
                                            <span className="text-gray-900 dark:text-white font-bold">{operation.urlTemplate}</span>
                                        </div>
                                    </div>
                                </div>

                                {operation.urlTemplate.includes('{') && (
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Path Variable Manifest</h3>
                                        <div className="bg-blue-50/30 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100/30 dark:border-blue-800/30">
                                            <p className="text-xs text-blue-600 dark:text-blue-400 font-bold italic">
                                                Active Parameter: <span className="bg-blue-600 text-white px-2 py-0.5 rounded ml-1 not-italic">{operation.urlTemplate.match(/\{([^}]+)\}/)?.[1]}</span>
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {['POST', 'PUT', 'PATCH'].includes(operation.method) && (
                                    <div>
                                        <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Payload Schema (Draft)</h3>
                                        <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                            <pre className="text-xs text-gray-900 dark:text-slate-300 font-mono leading-relaxed">
                                                {`{
  "context": "Enterprise Data Hub",
  "identity": "GUID",
  "payload": {
    "type": "Object",
    "description": "Auto-generated from OAS"
  }
}`}
                                            </pre>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    </div>

                    {/* Column 2: Response Specification */}
                    <div className="space-y-10">
                        <section className="bg-white dark:bg-slate-800 p-10 rounded-[2.5rem] border border-gray-100 dark:border-slate-700/30 shadow-sm transition-all hover:shadow-premium">
                            <h2 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest mb-8 flex items-center gap-3">
                                <span className="w-2 h-2 bg-emerald-500 rounded-full"></span> Response States
                            </h2>

                            <div className="space-y-6">
                                {/* HTTP 200 Success */}
                                <div className="group">
                                    <div className="flex items-center gap-3 mb-4">
                                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-lg text-[10px] font-black border border-emerald-100 dark:border-emerald-800">200 SUCCESS</span>
                                        <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Optimal Execution</span>
                                    </div>
                                    <div className="bg-gray-50 dark:bg-slate-900 p-6 rounded-2xl border border-gray-100 dark:border-slate-800">
                                        <pre className="text-xs text-gray-900 dark:text-slate-300 font-mono leading-relaxed opacity-60">
                                            {`{
  "status": "success",
  "data": { ... },
  "metadata": {
    "timestamp": "ISO8601"
  }
}`}
                                        </pre>
                                    </div>
                                </div>

                                {/* HTTP 400 Client Error */}
                                <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-amber-500 text-xs">400</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Client Malformation</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 cursor-help">ℹ️</span>
                                </div>

                                {/* HTTP 500 Network Error */}
                                <div className="flex items-center justify-between p-5 bg-gray-50/50 dark:bg-slate-900/50 rounded-2xl border border-gray-100 dark:border-slate-800/50">
                                    <div className="flex items-center gap-4">
                                        <span className="font-black text-rose-500 text-xs">500</span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Logic Failure</span>
                                    </div>
                                    <span className="text-xs font-bold text-gray-300 cursor-help">ℹ️</span>
                                </div>
                            </div>
                        </section>

                        {/* Sandbox Call-to-Action */}
                        <section className="bg-gradient-to-br from-blue-600 to-indigo-700 p-10 rounded-[2.5rem] shadow-2xl shadow-blue-500/20 text-white relative overflow-hidden group">
                            {/* Animated background accent */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl transform group-hover:scale-150 transition-transform duration-1000"></div>

                            <h2 className="text-xl font-black uppercase tracking-widest mb-4 relative z-10">API Console</h2>
                            <p className="text-blue-100/80 text-sm font-medium mb-8 leading-relaxed relative z-10">
                                Validate this endpoint with live data. Using your active subscription credentials for authentication.
                            </p>
                            <button className="w-full bg-white text-blue-600 font-black text-[10px] uppercase tracking-widest py-5 rounded-2xl shadow-premium hover:shadow-2xl transition-all hover:scale-[1.02] active:scale-[0.98] relative z-10">
                                Launch Console
                            </button>
                        </section>
                    </div>
                </div>
            </main>
        </MainLayout>
    );
};
