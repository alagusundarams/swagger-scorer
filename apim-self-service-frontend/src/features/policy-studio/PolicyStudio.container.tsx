import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { type PolicyScope, type PolicyFlow, type PolicyStep } from './types/policyTypes';
import { PolicyPalette } from './components/PolicyPalette';
import { RateLimitProperties } from './components/properties/RateLimitProperties';
import { generatePolicyXml } from './utils/policyGenerator';
import { DeploymentConfirmationModal } from './components/DeploymentConfirmationModal';
import { useStore } from '../../store/useStore';
import { api } from '../../api/baseClient';

// Placeholder Mock Data (Only used if no initialXml)
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

interface Props {
    initialXml?: string;
    resourceName?: string;
    resourceId?: string;
}

export const PolicyStudioContainer = ({ initialXml, resourceName = 'Unknown Policy', resourceId = 'legacy-policy' }: Props) => {
    const [selectedScope, setSelectedScope] = useState<PolicyScope>('api');
    const { addNotification } = useStore();

    // State
    const [flow, setFlow] = useState<PolicyFlow>(MOCK_FLOW);
    const [rawXml, setRawXml] = useState(initialXml || '');
    const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
    const [editMode, setEditMode] = useState<'visual' | 'code'>('visual');
    const [isLoading, setIsLoading] = useState(false);
    const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
    const [isDeploying, setIsDeploying] = useState(false);

    // Fetch Parsed Policy from Backend when initialXml changes
    useEffect(() => {
        const fetchPolicy = async () => {
            const xmlToParse = editMode === 'code' ? rawXml : initialXml;
            if (!xmlToParse) return;

            setIsLoading(true);
            try {
                const response = await api.post('/policy/analyze', { xml: xmlToParse });
                setFlow(response.data);
                // If it was initial load, set rawXml too
                if (!rawXml && initialXml) setRawXml(initialXml);
            } catch (error) {
                console.error('Policy Parsing Failed:', error);
            } finally {
                setIsLoading(false);
            }
        };

        // Only fetch if initial load or switching back to visual mode
        if (editMode === 'visual') {
            fetchPolicy();
        }
    }, [initialXml, editMode]);

    const activeStep = selectedStepId
        ? flow.inbound.find(s => s.id === selectedStepId) || flow.backend.find(s => s.id === selectedStepId)
        : null;

    const handleUpdateStep = (updates: Record<string, any>) => {
        if (!activeStep) return;
        const updateList = (list: PolicyStep[]) =>
            list.map(s => s.id === activeStep.id ? { ...s, properties: updates } : s);

        const newFlow: PolicyFlow = {
            ...flow,
            inbound: updateList(flow.inbound),
            backend: updateList(flow.backend)
        };
        setFlow(newFlow);
        // Sync rawXml
        setRawXml(generatePolicyXml(newFlow));
    };

    const handleDeploy = async (justification: string) => {
        setIsDeploying(true);
        try {
            const response = await api.post('/policy/deploy', {
                xml: rawXml,
                resourceId,
                justification,
                user: 'alagusundaram'
            });

            const result = response.data;
            addNotification({
                title: 'Deployment Successful',
                message: `Commit ${result.commitId} pushed to GitOps branch.` as any,
                type: 'success',
                navigateTo: '/inventory/my-products'
            });
            setIsDeployModalOpen(false);
        } catch (error) {
            console.error('Deploy Failed:', error);
            alert('Deployment failed. Check console for details.');
        } finally {
            setIsDeploying(false);
        }
    };

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 overflow-hidden">
            <DeploymentConfirmationModal
                isOpen={isDeployModalOpen}
                onClose={() => setIsDeployModalOpen(false)}
                onConfirm={handleDeploy}
                isDeploying={isDeploying}
                resourceName={resourceName}
            />

            {/* LEFT COLUMN: Palette */}
            <div className="w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 flex flex-col">
                <PolicyPalette />
            </div>

            <div className="flex-1 flex flex-col relative bg-slate-50 dark:bg-slate-900 bg-grid-slate-200/[0.04]">
                {isLoading && (
                    <div className="absolute inset-0 z-50 flex items-center justify-center bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                    </div>
                )}
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
                        <div className="flex bg-slate-200 dark:bg-slate-800 rounded-full p-1">
                            <button
                                onClick={() => setEditMode('visual')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition ${editMode === 'visual' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Visual
                            </button>
                            <button
                                onClick={() => setEditMode('code')}
                                className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition ${editMode === 'code' ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                XML Code
                            </button>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsDeployModalOpen(true)}
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition transform hover:scale-105 active:scale-95 flex items-center gap-2"
                        >
                            <span>🚀</span> Save & Deploy
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {editMode === 'visual' ? (
                        <div className="h-full overflow-auto p-12 flex items-start justify-center animate-in fade-in zoom-in-95 duration-500">
                            {/* The Pipe Visualization */}
                            <div className="w-full max-w-2xl space-y-8">
                                {/* INBOUND SECTION */}
                                <div className="relative">
                                    <div className="absolute -left-12 top-0 bottom-0 border-l-2 border-dashed border-gray-300 dark:border-slate-600"></div>
                                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-400 mb-4 ml-4">Inbound (Request)</h3>

                                    <div className="space-y-4">
                                        {flow.inbound.map((step: PolicyStep, idx: number) => (
                                            <div
                                                key={step.id}
                                                onClick={() => !step.isLocked && setSelectedStepId(step.id)}
                                                className={`relative p-5 rounded-3xl border-2 flex items-center justify-between group transition-all cursor-pointer ${step.isLocked
                                                    ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-75 cursor-not-allowed'
                                                    : selectedStepId === step.id
                                                        ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-500 shadow-2xl ring-4 ring-blue-500/10 scale-[1.02]'
                                                        : 'bg-white dark:bg-slate-800 border-white dark:border-slate-800 hover:border-blue-400 hover:shadow-xl'
                                                    }`}>
                                                <div className="flex items-center gap-4">
                                                    <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg ${step.isLocked ? 'bg-slate-200 dark:bg-slate-700' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                                                        {step.isLocked ? '🔒' : (idx + 1)}
                                                    </div>
                                                    <div>
                                                        <div className="font-black text-sm text-gray-900 dark:text-white">{step.displayName}</div>
                                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{step.scope}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* BACKEND SECTION */}
                                <div className="py-12 flex justify-center scale-110">
                                    <div className="px-10 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-full font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-purple-500/20">
                                        Backend Service
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="h-full animate-in slide-in-from-bottom-4 duration-500">
                            <Editor
                                height="100%"
                                defaultLanguage="xml"
                                theme="vs-dark"
                                value={rawXml}
                                onChange={(val) => setRawXml(val || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    lineNumbers: 'on',
                                    scrollBeyondLastLine: false,
                                    automaticLayout: true,
                                    padding: { top: 20 }
                                }}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT COLUMN: Properties */}
            <div className="w-80 bg-white dark:bg-slate-800 border-l border-gray-200 dark:border-slate-700 p-8 flex flex-col shadow-2xl z-20">
                <h2 className="font-black text-[10px] uppercase tracking-widest text-gray-400 mb-8">Specification</h2>

                {activeStep ? (
                    <div className="animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">{activeStep.displayName}</h3>
                            <div className="flex gap-2 mt-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${activeStep.isLocked ? 'bg-gray-100 text-gray-500' : 'bg-blue-50 text-blue-600'}`}>
                                    {activeStep.scope}
                                </span>
                            </div>
                        </div>

                        {activeStep.type === 'rate-limit' ? (
                            <RateLimitProperties step={activeStep} onChange={handleUpdateStep} />
                        ) : (
                            <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 text-sm italic text-gray-500">
                                This policy is currently read-only in visual mode.
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        <div className="w-12 h-12 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-2xl mb-4 opacity-50 grayscale">
                            ⚙️
                        </div>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">
                            Pick a step to<br />configure logic
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};
