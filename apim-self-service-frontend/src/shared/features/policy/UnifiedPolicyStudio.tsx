import React, { lazy, Suspense, useState } from 'react';
import { ApiOperation } from '../../../utils/swaggerParser';
import { usePolicyStudio } from './usePolicyStudio';
import { type PolicyStep } from './types';
import { PolicyExplorer } from './components/PolicyExplorer';
import { PolicyPalette } from './components/PolicyPalette';
import { PolicyFlowList } from './components/PolicyFlowList';

const PolicyXmlEditor = lazy(() => import('./components/PolicyXmlEditor').then(m => ({ default: m.PolicyXmlEditor })));

interface UnifiedPolicyStudioProps {
    specContent?: string;
    preParsedOperations?: ApiOperation[];
    productName?: string;
    productPolicyXml?: string;
    initialApiPolicies?: Record<string, string>;
    onSave?: (apiPolicies: Record<string, string>, productPolicyXml: string) => void;
    onBack?: () => void;
    readOnly?: boolean;
    environment?: string;
    onEnvironmentChange?: (env: any) => void;
}

export const UnifiedPolicyStudio: React.FC<UnifiedPolicyStudioProps> = ({
    specContent,
    preParsedOperations,
    productName = "Product",
    productPolicyXml,
    initialApiPolicies,
    onSave,
    onBack,
    readOnly = false,
    environment,
    onEnvironmentChange
}) => {
    const {
        operations,
        selectedOpId,
        setSelectedOpId,
        scanned,
        xmlError,
        policies,
        currentOp,
        currentPolicy,
        activeSteps,
        handleAddStep,
        handleUpdateStep,
        handleRemoveStep,
        handleReorderSteps,
        handleToggleMode,
        handleXmlChange
    } = usePolicyStudio({
        specContent,
        preParsedOperations,
        productPolicyXml,
        initialApiPolicies
    });

    const [activeSection, setActiveSection] = useState<string>('inbound');

    if (!scanned) {
        return (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 font-mono text-sm animate-pulse">
                Initializing Unified Policy Studio...
            </div>
        );
    }

    const handleSave = () => {
        const apiPolicies: Record<string, string> = {};
        Object.entries(policies).forEach(([id, state]) => {
            if (state.xmlContent) apiPolicies[id] = state.xmlContent;
        });
        onSave?.(apiPolicies, policies['product']?.xmlContent || '');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden rounded-[2rem] border border-gray-100 dark:border-slate-800 shadow-premium">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500">Unified Policy Studio</p>
                            {environment && (
                                <button
                                    onClick={() => {
                                        const nextEnv = environment === 'DEV' ? 'QA' : (environment === 'QA' ? 'PROD' : 'DEV');
                                        onEnvironmentChange?.(nextEnv);
                                    }}
                                    className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded text-[9px] font-black uppercase tracking-widest border border-blue-200 dark:border-blue-800 hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors cursor-pointer"
                                    title="Click to cycle environment"
                                >
                                    {environment}
                                </button>
                            )}
                        </div>
                        <h2 className="text-2xl font-black tracking-tighter">
                            {selectedOpId === 'product' ? productName : (currentOp?.id === 'global' ? 'Global API Policy' : currentOp?.id)}
                        </h2>
                    </div>
                </div>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2 mr-4 bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-1 border border-slate-200 dark:border-slate-700">
                        <span className="text-[9px] font-black uppercase text-slate-400 mr-2">Jump To:</span>
                        {(['inbound', 'backend', 'outbound', 'on-error'] as const).map(sec => (
                            <button
                                key={sec}
                                onClick={() => setActiveSection(sec)}
                                className={`text-[9px] font-black uppercase px-2 py-1 rounded-md transition-all ${activeSection === sec
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'text-slate-500 hover:bg-white dark:hover:bg-slate-700'
                                    }`}
                            >
                                {sec.split('-').join(' ')}
                            </button>
                        ))}
                    </div>
                    <div className="flex bg-slate-100 dark:bg-slate-800 rounded-xl p-1 border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={handleToggleMode}
                            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentPolicy?.mode === 'simple'
                                ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            VISUAL
                        </button>
                        <button
                            onClick={handleToggleMode}
                            className={`px-4 py-1.5 text-[10px] font-black rounded-lg transition-all ${currentPolicy?.mode === 'xml'
                                ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            XML
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex flex-1 overflow-hidden">
                <PolicyExplorer
                    operations={operations}
                    selectedOpId={selectedOpId}
                    setSelectedOpId={setSelectedOpId}
                    policies={policies}
                />

                <div className="flex-1 overflow-hidden relative flex flex-col bg-slate-50 dark:bg-slate-950">
                    {currentPolicy?.mode === 'simple' ? (
                        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-12">
                            {/* Inbound Section */}
                            <PolicyFlowList
                                section="inbound"
                                steps={activeSteps.filter((s: PolicyStep) => s.section === 'inbound')}
                                isActive={activeSection === 'inbound'}
                                onActivate={() => setActiveSection('inbound')}
                                onAdd={(tid: string) => handleAddStep(tid, 'inbound')}
                                onUpdate={handleUpdateStep}
                                onRemove={handleRemoveStep}
                                onReorder={(steps: PolicyStep[]) => handleReorderSteps('inbound', steps)}
                                readOnly={readOnly}
                            />

                            {/* Backend Section */}
                            <PolicyFlowList
                                section="backend"
                                steps={activeSteps.filter((s: PolicyStep) => s.section === 'backend')}
                                isActive={activeSection === 'backend'}
                                onActivate={() => setActiveSection('backend')}
                                onAdd={(tid: string) => handleAddStep(tid, 'backend')}
                                onUpdate={handleUpdateStep}
                                onRemove={handleRemoveStep}
                                onReorder={(steps: PolicyStep[]) => handleReorderSteps('backend', steps)}
                                readOnly={readOnly}
                            />

                            <div className="h-px bg-slate-200 dark:bg-slate-800 relative my-16">
                                <span className="absolute left-1/2 -top-3 -translate-x-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-4 py-0.5 rounded-full text-[10px] font-black text-slate-400 uppercase tracking-widest">Backend Target</span>
                            </div>

                            {/* Outbound Section */}
                            <PolicyFlowList
                                section="outbound"
                                steps={activeSteps.filter((s: PolicyStep) => s.section === 'outbound')}
                                isActive={activeSection === 'outbound'}
                                onActivate={() => setActiveSection('outbound')}
                                onAdd={(tid: string) => handleAddStep(tid, 'outbound')}
                                onUpdate={handleUpdateStep}
                                onRemove={handleRemoveStep}
                                onReorder={(steps: PolicyStep[]) => handleReorderSteps('outbound', steps)}
                                readOnly={readOnly}
                            />

                            {/* On Error Section */}
                            <div className="mt-16 pt-8 border-t border-red-100 dark:border-red-900/20">
                                <PolicyFlowList
                                    section="on-error"
                                    steps={activeSteps.filter((s: PolicyStep) => s.section === 'on-error')}
                                    isActive={activeSection === 'on-error'}
                                    onActivate={() => setActiveSection('on-error')}
                                    onAdd={(tid: string) => handleAddStep(tid, 'on-error')}
                                    onUpdate={handleUpdateStep}
                                    onRemove={handleRemoveStep}
                                    onReorder={(steps: PolicyStep[]) => handleReorderSteps('on-error', steps)}
                                    readOnly={readOnly}
                                />
                            </div>
                        </div>
                    ) : (
                        <Suspense fallback={<div className="flex-1 bg-[#1e1e1e]" />}>
                            <PolicyXmlEditor
                                xmlContent={currentPolicy?.xmlContent || ''}
                                onChange={handleXmlChange}
                                error={xmlError}
                                readOnly={readOnly}
                            />
                        </Suspense>
                    )}
                </div>

                <PolicyPalette
                    activeSection={activeSection}
                    onSectionChange={setActiveSection}
                    onSelect={(tid: string) => handleAddStep(tid, activeSection as any)}
                    readOnly={readOnly}
                />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex justify-between items-center z-10">
                <button onClick={onBack} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-colors">Back</button>
                <button
                    onClick={handleSave}
                    className="px-8 py-3 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-purple-700 transition-all shadow-lg hover:-translate-y-0.5"
                >
                    Save & Apply Configuration →
                </button>
            </div>
        </div>
    );
};
