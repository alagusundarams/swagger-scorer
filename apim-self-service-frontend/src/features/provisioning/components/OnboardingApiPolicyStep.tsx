import { lazy, Suspense } from 'react';
import { ApiOperation } from '../../../utils/swaggerParser';
import { Environment } from '../../../core/types/commonTypes';

// Components
import { PolicyExplorer } from './PolicyExplorer';
import { PolicyPalette } from './PolicyPalette';
import { PolicyVisualEditor } from './PolicyVisualEditor';
import { usePolicyStudio } from './usePolicyStudio';

// Lazy load the heavy XML editor
const PolicyXmlEditor = lazy(() => import('./PolicyXmlEditor').then(m => ({ default: m.PolicyXmlEditor })));

interface OnboardingApiPolicyStepProps {
    onBack: () => void;
    onNext: (policies: Record<string, string>, productPolicyXml?: string) => void;
    specContent?: string;
    preParsedOperations?: ApiOperation[];
    readOnly?: boolean;
    productPolicyXml?: string;
    productName?: string;
    initialApiPolicies?: Record<string, string>;
    environment?: Environment;
    onEnvironmentChange?: (env: Environment) => void;
}

export const OnboardingApiPolicyStep = ({
    onBack,
    onNext,
    specContent,
    preParsedOperations,
    readOnly = false,
    productPolicyXml,
    productName = "New Product",
    initialApiPolicies,
    environment,
    onEnvironmentChange
}: OnboardingApiPolicyStepProps) => {

    const {
        operations,
        selectedOpId,
        setSelectedOpId,
        scanned,
        xmlError,
        policies,
        isProductScope,
        currentOp,
        currentPolicy,
        activePolicies,
        handleAddPolicy,
        handleUpdatePolicyValue,
        handleRemovePolicy,
        handleSectionChange,
        handleToggleMode,
        handleXmlChange,
        handleStepNext
    } = usePolicyStudio({
        specContent,
        preParsedOperations,
        productPolicyXml,
        initialApiPolicies,
        onNext
    });

    const environments: Environment[] = ['ALL', 'DEV', 'QA', 'STAGE', 'PROD'];

    if (!scanned) return <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900 text-slate-400 font-mono text-sm animate-pulse">Initializing Policy Studio Engine...</div>;

    return (
        <div className="animate-fade-in flex flex-col h-full bg-slate-50 dark:bg-slate-950 overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex justify-between items-center shadow-sm z-10">
                <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-purple-500 mb-1">Unified Policy Studio</p>
                    <h2 className="text-2xl font-black tracking-tighter">
                        {isProductScope ? (productName || 'Product Policy') : (currentOp?.id === 'global' ? 'Global API Policy' : 'Operation Policy')}
                    </h2>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                        {environments.map(env => (
                            <button
                                key={env}
                                onClick={() => onEnvironmentChange?.(env)}
                                className={`px-3 py-1.5 text-[10px] font-black rounded-md transition-all ${environment === env
                                    ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/20'
                                    : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                                    }`}
                            >
                                {env}
                            </button>
                        ))}
                    </div>

                    {readOnly && (
                        <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 font-bold rounded-full border border-amber-200 dark:border-amber-800 flex items-center gap-2 text-xs">
                            🔒 READ ONLY
                        </span>
                    )}
                </div>
            </div>

            {/* Main Content: Split Pane */}
            <div className="flex flex-1 overflow-hidden">
                <PolicyExplorer
                    operations={operations}
                    selectedOpId={selectedOpId}
                    setSelectedOpId={setSelectedOpId}
                    scanned={scanned}
                    policies={policies}
                />

                <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-950 overflow-hidden relative border-r border-slate-200 dark:border-slate-800">
                    <div className="h-12 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-slate-500 flex items-center gap-2">
                            {isProductScope ? '📦 PRODUCT POLICIES' : (currentOp?.id === 'global' ? '🌐 API LEVEL POLICIES' : '⚡ ' + (currentOp?.id || ''))}
                        </span>

                        <div className="flex bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5 border border-slate-200 dark:border-slate-700">
                            <button
                                onClick={handleToggleMode}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${currentPolicy?.mode === 'simple'
                                    ? 'bg-white dark:bg-slate-700 text-purple-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                VISUAL
                            </button>
                            <button
                                onClick={handleToggleMode}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition-all ${currentPolicy?.mode === 'xml'
                                    ? 'bg-white dark:bg-slate-700 text-blue-600 shadow-sm'
                                    : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
                                    }`}
                            >
                                XML
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {currentPolicy?.mode === 'simple' ? (
                            <PolicyVisualEditor
                                activePolicies={activePolicies}
                                handleUpdatePolicyValue={handleUpdatePolicyValue}
                                handleRemovePolicy={handleRemovePolicy}
                                handleSectionChange={handleSectionChange}
                                readOnly={readOnly}
                            />
                        ) : (
                            <Suspense fallback={<div className="flex-1 flex items-center justify-center bg-[#1e1e1e] text-slate-500 text-xs font-mono">Loading XML Editor...</div>}>
                                <PolicyXmlEditor
                                    xmlContent={currentPolicy?.xmlContent || ''}
                                    onChange={handleXmlChange}
                                    error={xmlError}
                                    readOnly={readOnly}
                                />
                            </Suspense>
                        )}
                    </div>
                </div>

                <PolicyPalette readOnly={readOnly} handleAddPolicy={handleAddPolicy} />
            </div>

            {/* Footer */}
            <div className="p-6 border-t border-slate-100 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex justify-between items-center z-10">
                <button onClick={onBack} className="px-6 py-2 text-gray-500 font-bold hover:text-gray-900 dark:hover:text-white transition-colors">Back</button>
                {readOnly ? (
                    <button disabled className="px-8 py-3 bg-slate-300 text-slate-500 font-bold text-xs uppercase tracking-widest rounded-xl cursor-not-allowed border border-slate-200">
                        Read Only Mode
                    </button>
                ) : (
                    <button onClick={handleStepNext} className="px-8 py-3 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-purple-700 transition-all shadow-lg">
                        Save Configuration →
                    </button>
                )}
            </div>
        </div>
    );
};
