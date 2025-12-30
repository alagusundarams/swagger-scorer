import { useState } from 'react';
import { type API, type Product } from '../../../shared/types/domain';
import { maskKey } from '../../../utils/securityUtils';

interface ApiConsoleProps {
    product: Product;
    subscriptionKey?: string;
}

export const ApiConsole = ({ product, subscriptionKey }: ApiConsoleProps) => {
    const [selectedApi, setSelectedApi] = useState<API | null>(product.apis[0] || null);
    const [selectedOp, setSelectedOp] = useState<any>(selectedApi?.operations?.[0] || null);
    const [method, setMethod] = useState(selectedOp?.method || 'GET');
    const [path, setPath] = useState(selectedOp?.urlTemplate || '');
    const [response, setResponse] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(false);

    const handleExecute = async () => {
        setIsLoading(true);
        setResponse(null);

        // Mocking the execution for now as real APIM calls require CORS/Gateway setup
        setTimeout(() => {
            setResponse({
                status: 200,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Powered-By': 'AzureAPIM'
                },
                body: {
                    message: "Success",
                    timestamp: new Date().toISOString(),
                    data: [
                        { id: 1, name: "Sample Resource A" },
                        { id: 2, name: "Sample Resource B" }
                    ]
                }
            });
            setIsLoading(false);
        }, 1200);
    };

    return (
        <div className="bg-slate-900 rounded-[2.5rem] overflow-hidden shadow-2xl border border-white/5">
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
                <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-xs mb-1">Interactive Console</h3>
                    <p className="text-slate-400 text-[10px] font-medium">Test endpoints with your active subscription keys.</p>
                </div>
                <div className="flex gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/20 shadow-[0_0_10px_rgba(244,63,94,0.3)]"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/20"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]"></div>
                </div>
            </div>

            <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Request Panel */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Target API</label>
                        <select
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold focus:ring-2 focus:ring-blue-500/50 outline-none"
                            value={selectedApi?.id}
                            onChange={(e) => {
                                const api = product.apis.find(a => a.id === e.target.value);
                                setSelectedApi(api || null);
                                if (api?.operations?.[0]) {
                                    setSelectedOp(api.operations[0]);
                                    setMethod(api.operations[0].method);
                                    setPath(api.operations[0].urlTemplate);
                                }
                            }}
                        >
                            {product.apis.map(api => (
                                <option key={api.id} value={api.id}>{api.displayName}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex gap-4">
                        <div className="w-32">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Method</label>
                            <span className={`block w-full text-center py-3 rounded-xl text-xs font-black ring-1 ${method === 'GET' ? 'bg-blue-500/10 text-blue-400 ring-blue-500/30' :
                                method === 'POST' ? 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/30' :
                                    'bg-amber-500/10 text-amber-400 ring-amber-500/30'
                                }`}>
                                {method}
                            </span>
                        </div>
                        <div className="flex-1">
                            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Path</label>
                            <input
                                type="text"
                                readOnly
                                value={path}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-mono focus:ring-2 focus:ring-blue-500/50 outline-none"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Authentication</label>
                        <div className="bg-white/5 border border-white/10 rounded-xl px-4 py-3 flex items-center justify-between">
                            <span className="text-slate-400 text-xs font-mono">Ocp-Apim-Subscription-Key</span>
                            <span className="text-blue-400 text-xs font-mono font-bold tracking-tighter">
                                {subscriptionKey ? maskKey(subscriptionKey) : 'MISSING_KEY'}
                            </span>
                        </div>
                        {!subscriptionKey && (
                            <p className="text-[10px] text-amber-500 font-bold mt-2 ml-1">⚠️ You must have an active subscription to test this API.</p>
                        )}
                    </div>

                    <button
                        onClick={handleExecute}
                        disabled={isLoading || !subscriptionKey}
                        className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all flex items-center justify-center gap-3"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        ) : (
                            <><span>⚡</span> Execute Request</>
                        )}
                    </button>
                </div>

                {/* Response Panel */}
                <div className="bg-black/40 rounded-3xl border border-white/5 p-6 font-mono text-xs overflow-auto max-h-[400px]">
                    {response ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <span className="text-slate-500 uppercase font-bold text-[9px] tracking-widest">Headers</span>
                                    <span className={`px-2 py-0.5 rounded text-[10px] font-black ${response.status === 200 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        HTTP {response.status}
                                    </span>
                                </div>
                                <div className="text-slate-400 space-y-1">
                                    {Object.entries(response.headers).map(([k, v]) => (
                                        <div key={k}><span className="text-blue-400/70">{k}:</span> {v as string}</div>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <span className="text-slate-500 uppercase font-bold text-[9px] tracking-widest block mb-2">Body</span>
                                <pre className="text-white/90 leading-relaxed">
                                    {JSON.stringify(response.body, null, 2)}
                                </pre>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex flex-col items-center justify-center text-slate-600 space-y-4 py-20">
                            <div className="text-4xl opacity-20">📡</div>
                            <div className="text-center">
                                <p className="font-bold uppercase tracking-widest text-[10px]">Ready for Dispatch</p>
                                <p className="text-[9px] font-medium opacity-50">Select an operation and click execute.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
