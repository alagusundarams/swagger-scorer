import { useState } from 'react';
import { type PolicyScope, type PolicyFlow, type PolicyStep } from './types/policyTypes';
import { PolicyPalette } from './components/PolicyPalette';
import { RateLimitProperties } from './components/properties/RateLimitProperties';
import { generatePolicyXml } from './utils/policyGenerator';
import { CustomXmlProperties } from './components/properties/CustomXmlProperties';

// Placeholder Mock Data
const MOCK_FLOW: PolicyFlow = {
    inbound: [
        { id: '1', type: 'base', displayName: 'Global Policy', scope: 'global', isLocked: true, xmlSnippet: '<base />', properties: {} },
        { id: '2', type: 'cors', displayName: 'CORS (Global)', scope: 'global', isLocked: true, xmlSnippet: '<cors>...</cors>', properties: {} },
        { id: '3', type: 'rate-limit', displayName: 'Rate Limit (API)', scope: 'api', isLocked: false, properties: { calls: 20, renewalPeriod: 90, counterKey: '@(context.Subscription.Id)' } }
    ],
    backend: [
        { id: '4', type: 'base', displayName: 'Forward to Backend', scope: 'global', isLocked: true, xmlSnippet: '<base />', properties: {} }
    ],
    outbound: [],
    onError: []
};

import { parsePolicyXml } from './utils/xmlParser';

interface Props {
    initialXml?: string;
}

export const PolicyStudioContainer = ({ initialXml }: Props) => {
    const [selectedScope, setSelectedScope] = useState<PolicyScope>('api');

    // Initialize Flow: Either from XML (if provided) or Default Empty
    const [flow, setFlow] = useState<PolicyFlow>(() => {
        if (initialXml) {
            return parsePolicyXml(initialXml);
        }
        return MOCK_FLOW; // Or empty default
    });
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [showXml, setShowXml] = useState(false);

    const activeStep = selectedStepId
        ? flow.inbound.find(s => s.id === selectedStepId) || flow.backend.find(s => s.id === selectedStepId)
        : null;

    const handleUpdateStep = (updates: Record<string, any>) => {
        if (!activeStep) return;
        const updateList = (list: PolicyStep[]) =>
            list.map(s => s.id === activeStep.id ? { ...s, properties: updates } : s);

        setFlow(prev => ({
            ...prev,
            inbound: updateList(prev.inbound),
            backend: updateList(prev.backend)
        }));
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            {/* LEFT COLUMN: Palette */}
            <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                <PolicyPalette />
            </div>

            {/* CENTER COLUMN: The Visualizer */}
            <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-900 bg-grid-slate-200/[0.04]">
                <div className="p-4 flex justify-between items-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm border-b border-gray-100 dark:border-slate-800 z-10">
                    <div className="flex items-center gap-4">
                        <select
                            value={selectedScope}
                            onChange={(e) => setSelectedScope(e.target.value as any)}
                            className="bg-transparent font-black text-lg text-gray-900 dark:text-white outline-none"
                        >
                            <option value="global">Global Scope</option>
                            <option value="product">Product Scope</option>
                            <option value="api">API Scope</option>
                            <option value="operation">Operation Scope</option>
                        </select>
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-bold uppercase">Visual Mode</span>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowXml(true)}
                            className="px-4 py-2 bg-slate-200 dark:bg-slate-700 rounded-lg text-xs font-bold uppercase hover:bg-slate-300 dark:hover:bg-slate-600 transition"
                        >
                            View XML
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition">
                            Save Policy
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-12 flex items-start justify-center">
                    {/* The Pipe Visualization */}
                    <div className="w-full max-w-2xl space-y-8">

                        {/* INBOUND SECTION */}
                        <div className="relative">
                            <div className="absolute -left-12 top-0 bottom-0 border-l-2 border-dashed border-gray-300 dark:border-slate-600"></div>
                            <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4 ml-4">Inbound (Request)</h3>

                            <div className="space-y-4">
                                {flow.inbound.map((step, idx) => (
                                    <div
                                        key={step.id}
                                        onClick={() => !step.isLocked && setSelectedStepId(step.id)}
                                        className={`relative p-4 rounded-xl border-2 flex items-center justify-between group transition-all cursor-pointer ${step.isLocked
                                            ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75 cursor-not-allowed'
                                            : selectedStepId === step.id
                                                ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-md ring-2 ring-blue-500/20'
                                                : 'bg-white dark:bg-slate-800 border-blue-100 dark:border-blue-900 hover:border-blue-400 hover:shadow-lg'
                                            }`}>
                                        {/* Connecting Line */}
                                        {idx < flow.inbound.length - 1 && (
                                            <div className="absolute left-1/2 bottom-0 w-0.5 h-4 bg-gray-300 dark:bg-slate-600 -mb-4 translate-y-full z-0"></div>
                                        )}

                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs ${step.isLocked ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'
                                                }`}>
                                                {step.isLocked ? '🔒' : (idx + 1)}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900 dark:text-white">{step.displayName}</div>
                                                <div className="text-[10px] text-gray-500 uppercase tracking-wide">{step.scope}</div>
                                            </div>
                                        </div>

                                        {!step.isLocked && (
                                            <button className="opacity-0 group-hover:opacity-100 p-2 hover:bg-red-50 text-red-500 rounded transition">
                                                🗑️
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* BACKEND SECTION - The Midpoint */}
                        <div className="py-8 flex justify-center">
                            <div className="px-6 py-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-full font-black text-xs uppercase tracking-widest text-purple-600 dark:text-purple-400">
                                Backend Service
                            </div>
                        </div>

                    </div>
                </div>
            </div>

            {/* RIGHT COLUMN: Properties */}
            <div className="w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-6 flex flex-col">
                <h2 className="font-black text-xs uppercase tracking-widest text-gray-500 mb-6">Step Properties</h2>

                {activeStep ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="mb-6 pb-6 border-b border-gray-100 dark:border-slate-700">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{activeStep.displayName}</h3>
                            <p className="text-xs text-gray-500">{activeStep.type}</p>
                        </div>

                        {activeStep.type === 'rate-limit' ? (
                            <RateLimitProperties step={activeStep} onChange={handleUpdateStep} />
                        ) : activeStep.type === 'custom-xml' ? (
                            <CustomXmlProperties step={activeStep} />
                        ) : (
                            <div className="p-4 bg-yellow-50 text-yellow-700 rounded-lg text-sm">
                                Properties for <strong>{activeStep.type}</strong> are under construction.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <span className="text-4xl mb-4 opacity-50">👈</span>
                        <p className="text-sm italic">Select a policy step to configure its parameters.</p>
                    </div>
                )}
            </div>

            {/* XML Preview Modal */}
            {showXml && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-12 backdrop-blur-sm">
                    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl h-[80vh] flex flex-col overflow-hidden border border-gray-200 dark:border-slate-700">
                        <div className="p-4 border-b border-gray-200 dark:border-slate-700 flex justify-between items-center bg-gray-50 dark:bg-slate-800">
                            <h3 className="font-bold text-lg">Generated Policy XML</h3>
                            <button onClick={() => setShowXml(false)} className="text-gray-500 hover:text-gray-900 dark:hover:text-white">✕</button>
                        </div>
                        <div className="flex-1 overflow-auto bg-slate-900 p-6">
                            <pre className="font-mono text-sm text-green-400 whitespace-pre-wrap">
                                {generatePolicyXml(flow)}
                            </pre>
                        </div>
                        <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-end gap-3 bg-gray-50 dark:bg-slate-800">
                            <button onClick={() => setShowXml(false)} className="px-4 py-2 text-gray-600 font-bold hover:bg-gray-200 rounded-lg">Close</button>
                            <button className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700">Copy to Clipboard</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
