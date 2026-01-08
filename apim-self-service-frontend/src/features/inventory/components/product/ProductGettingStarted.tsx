import { useState } from 'react';
import { type Product, type Subscription } from '../../../../shared/types/domain';
import { maskKey } from '../../../../utils/securityUtils';
import { getGatewayUrl } from '../../../../config/appConfig';

interface ProductGettingStartedProps {
    product: Product;
    subscription: Subscription;
}

export function ProductGettingStarted({ product, subscription }: ProductGettingStartedProps) {
    const [selectedEnv, setSelectedEnv] = useState<'DEV' | 'QA' | 'PROD'>('PROD');

    return (
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
                                    {getGatewayUrl(selectedEnv, product.version)}
                                </code>
                                <button
                                    onClick={() => navigator.clipboard.writeText(getGatewayUrl(selectedEnv, product.version))}
                                    className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-white"
                                    title="Copy URL"
                                >
                                    📋
                                </button>
                            </div>
                        </div>

                        <div className="p-6 bg-black/20 rounded-2xl border border-white/5 relative group/code">
                            <p className="text-xs font-bold text-slate-400 mb-4">Sample CURL Request</p>
                            <pre className="text-[11px] font-mono text-slate-300 overflow-x-auto">
                                {`curl -X GET "${getGatewayUrl('PROD', product.version)}/metadata" \\
  -H "Ocp-Apim-Subscription-Key: ${maskKey(subscription.primaryKey.value)}" \\
  -H "Content-Type: application/json"`}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard.writeText(`curl -X GET "${getGatewayUrl('PROD', product.version)}/metadata" -H "Ocp-Apim-Subscription-Key: ${subscription.primaryKey.value}" -H "Content-Type: application/json"`)}
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
    );
}
