import { useState, useEffect } from 'react';
import { type Product, type Environment } from '../../../../shared/types/domain';
import { getNextEnvironment } from '../../../../utils/statusUtils';
import { OnboardingApiPolicyStep } from '../../../provisioning/components/OnboardingApiPolicyStep';
import { OnboardingResolutionStep } from '../../../provisioning/components/OnboardingResolutionStep';
import { inventoryApi } from '../../api/inventoryClient';
import { useStore } from '../../../../store/useStore';

/**
 * ------------------------------------------------------------------
 * 📍 Component: PromotionWizard
 * ------------------------------------------------------------------
 * 🔄 LIFECYCLE:
 * - Triggered from ProductDetailProducer.view.tsx when a user clicks "Promote".
 * - Orchestrates the multi-step journey from Dev -> QA -> Stage -> Prod.
 * 
 * 📥 DATA INFLOW:
 * - `product`: The source product entity containing current environment and policies.
 * - `inventoryApi.getProductPolicy`: Hydrates the baseline XML from Git/DB on mount.
 * 
 * 📤 DATA OUTFLOW (PR Creation):
 * - `inventoryApi.requestPromotion`: Final payload sent to backend to trigger 
 *   an ADO/GitHub Pull Request with environment-specific variables.
 * 
 * 🧩 MFE / EVENT BUS:
 * - Uses `useStore` (Zustand) for toast notifications (`addNotification`).
 * - Emits `onComplete` to parent to trigger a view refresh after PR creation.
 * ------------------------------------------------------------------
 */
interface PromotionWizardProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onComplete: () => void;
}

export const PromotionWizard = ({ isOpen, onClose, product, onComplete }: PromotionWizardProps) => {
    const { addNotification } = useStore();
    const [step, setStep] = useState(1); // 1: Strategy, 2: Edit (Opt), 3: Resolve, 4: Summary
    const [strategy, setStrategy] = useState<'copy' | 'modify'>('copy');
    const [targetEnv, setTargetEnv] = useState<Environment>('QA');
    const [policyXml, setPolicyXml] = useState('');
    const [apiPolicies, setApiPolicies] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(false);
    const [resolvedValues, setResolvedValues] = useState<{ name: string; value: string }[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTargetEnv(getNextEnvironment(product.environment));
            // Pre-fetch current policy as baseline
            setIsInitialLoading(true);
            inventoryApi.getProductPolicy(product.id)
                .then(res => setPolicyXml(res.policyXml))
                .catch(err => {
                    console.error("Failed to fetch product policy", err);
                    addNotification({
                        type: 'error',
                        title: 'Load Error',
                        message: 'Failed to fetch existing policies. Using empty default.'
                    });
                })
                .finally(() => setIsInitialLoading(false));
        }
    }, [isOpen, product.id, product.environment, addNotification]);

    if (!isOpen) return null;


    const handleStrategySelect = (s: 'copy' | 'modify') => {
        setStrategy(s);
        if (s === 'copy') {
            setStep(3); // Jump to resolution
        } else {
            setStep(2); // Go to Policy Studio
        }
    };

    const handlePromotionSubmit = async () => {
        setLoading(true);
        try {
            await inventoryApi.requestPromotion(
                product.id,
                targetEnv,
                strategy === 'modify' ? policyXml : undefined,
                resolvedValues
            );

            addNotification({
                type: 'success',
                title: 'Promotion Requested',
                message: `PR created for promotion to ${targetEnv}. Follow Git workflow for approval.`,
                navigateTo: `/products/${product.id}`
            });
            onComplete();
            onClose();
        } catch (err: any) {
            console.error("Promotion failed", err);
            addNotification({
                type: 'error',
                title: 'Promotion Failed',
                message: err.response?.data?.message || 'Failed to create promotion PR. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex flex-col overflow-hidden animate-fade-in">
            {/* Header */}
            <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-6 flex justify-between items-center shrink-0">
                <div>
                    <div className="flex items-center gap-3 mb-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Promotion Workflow</span>
                        <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase tracking-widest">
                            {product.environment} → {targetEnv}
                        </span>
                    </div>
                    <h2 className="text-2xl font-black tracking-tighter">Promote {product.displayName}</h2>
                </div>
                <button onClick={onClose} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
                    <span className="text-xl">✕</span>
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden relative flex flex-col">
                {isInitialLoading && (
                    <div className="absolute inset-0 z-50 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <div className="w-12 h-12 border-4 border-t-blue-500 border-r-transparent border-b-blue-500 border-l-transparent animate-spin rounded-full"></div>
                        <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Hydrating Environment Policy...</p>
                    </div>
                )}

                {/* Step 1: Strategy Selection */}
                {step === 1 && (
                    <div className="flex-1 flex items-center justify-center p-12">
                        <div className="max-w-2xl w-full">
                            <h3 className="text-xl font-black mb-8 text-center uppercase tracking-widest">Select Promotion Strategy</h3>
                            <div className="grid grid-cols-2 gap-8">
                                <button
                                    onClick={() => handleStrategySelect('copy')}
                                    className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 hover:border-blue-500 transition-all text-left group shadow-xl"
                                >
                                    <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">📋</span>
                                    <h4 className="text-lg font-black mb-2">Sync Previous Env</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Exact copy of {product.environment} policies. Fast and reliable for standard updates.</p>
                                </button>
                                <button
                                    onClick={() => handleStrategySelect('modify')}
                                    className="p-8 bg-white dark:bg-slate-800 rounded-[2.5rem] border-2 border-slate-100 dark:border-slate-700 hover:border-purple-500 transition-all text-left group shadow-xl"
                                >
                                    <span className="text-4xl mb-4 block group-hover:scale-110 transition-transform">✏️</span>
                                    <h4 className="text-lg font-black mb-2">Custom Promotion</h4>
                                    <p className="text-xs text-slate-500 leading-relaxed">Modify policies specifically for {targetEnv}. Use for environment-specific tweaks.</p>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Policy Editor (Modified Copy) */}
                {step === 2 && (
                    <div className="flex-1 flex flex-col min-h-0 bg-slate-50 dark:bg-slate-950">
                        <OnboardingApiPolicyStep
                            onBack={() => setStep(1)}
                            onNext={(apis, productXml) => {
                                setApiPolicies(apis);
                                setPolicyXml(productXml || '');
                                setStep(3);
                            }}
                            productName={product.displayName}
                            productPolicyXml={policyXml}
                            environment={targetEnv}
                        />
                    </div>
                )}

                {/* Step 3: Variable Resolution for Target Env */}
                {step === 3 && (
                    <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-slate-900">
                        <OnboardingResolutionStep
                            productPolicyXml={policyXml}
                            apiPolicies={apiPolicies}
                            existingNamedValues={[]} // We want to resolve specifically for the target env
                            onBack={() => setStep(strategy === 'modify' ? 2 : 1)}
                            onNext={(values) => {
                                setResolvedValues(values);
                                setStep(4);
                            }}
                        />
                    </div>
                )}

                {/* Step 4: Final Summary & Submit */}
                {step === 4 && (
                    <div className="flex-1 flex items-center justify-center p-12 bg-slate-50 dark:bg-slate-950">
                        <div className="max-w-xl w-full bg-white dark:bg-slate-800 p-10 rounded-[3rem] shadow-premium border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center">
                            <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-3xl mb-6">🚀</div>
                            <h3 className="text-2xl font-black mb-2 tracking-tighter">Ready for {targetEnv}</h3>
                            <p className="text-sm text-slate-500 mb-8 max-w-sm">
                                A new Pull Request will be created. Your {targetEnv}-specific variables have been captured and will be injected during the pipeline run.
                            </p>

                            <div className="w-full space-y-3 mb-8">
                                <div className="flex justify-between text-xs p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                    <span className="font-bold text-slate-400 uppercase tracking-widest">Strategy</span>
                                    <span className="font-black text-purple-600 uppercase tracking-widest">{strategy}</span>
                                </div>
                                <div className="flex justify-between text-xs p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl">
                                    <span className="font-bold text-slate-400 uppercase tracking-widest">Resolved Vars</span>
                                    <span className="font-black text-blue-600">{resolvedValues.length} Detected</span>
                                </div>
                            </div>

                            <button
                                onClick={handlePromotionSubmit}
                                disabled={loading}
                                className="w-full py-4 bg-blue-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:bg-blue-700 transition-all shadow-xl shadow-blue-500/20 flex items-center justify-center gap-3"
                            >
                                {loading ? 'Creating PR...' : `Create ${targetEnv} Promotion PR →`}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
