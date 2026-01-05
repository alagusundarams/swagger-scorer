import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import { useTeamsStore } from '../../features/teams';
import { OnboardingProgressBar, OnboardingIdentityStep, OnboardingFulfillmentStep, OnboardingSpecStep, OnboardingApiPolicyStep, OnboardingIntentModal, OnboardingResolutionStep, saveDraft, loadDraft } from '../../features/provisioning';
import { useInventoryStore, type Product } from '../../features/inventory';

/**
 * OnboardingPage Controller (Visual Wizard v2)
 * 
 * Flow:
 * 0. Intent (New vs Existing)
 * 1. Identity (Skipped if Existing)
 * 2. Contract (Spec)
 * 3. Product Policy (Skipped if Existing)
 * 4. API Policy
 * 5. Fulfillment
 */
interface OnboardingWizardProps {
    validateProductName: (name: string) => boolean;
}

export const OnboardingWizard = ({ validateProductName }: OnboardingWizardProps) => {
    const navigate = useNavigate();

    // --- Store Integration ---
    const { user, setPageTitle } = useStore();
    const { teams: allTeams } = useTeamsStore();
    const { fetchConfiguration, products } = useInventoryStore();

    useEffect(() => {
        setPageTitle('Onboard Product');
    }, [setPageTitle]);

    // --- Wizard State ---
    const [step, setStep] = useState(0); // 0 = Intent Modal
    const [intent, setIntent] = useState<'new' | 'existing'>('new');
    const [existingProduct, setExistingProduct] = useState<Product | undefined>(undefined);

    const [formData, setFormData] = useState({
        name: '',
        version: '',
        description: '',
        ownerTeamId: user?.teams[0] || '',
        visibility: 'public' as 'public' | 'private' | 'owner-only',
        selectedTeams: [] as string[],
        requiresAuth: false,
        specContent: '',
        apiName: '',
        apiSuffix: '',
        // New Policy States
        productPolicy: undefined as any,
        apiPolicies: undefined as any,
        namedValues: [] as { name: string; value: string }[]
    });

    const [draftId, setDraftId] = useState<string | null>(null);

    // --- Draft Logic: Auto-save at each step ---
    useEffect(() => {
        if (step > 0 && formData.name) {
            const currentDraftId = draftId || formData.name.toLowerCase().replace(/\s+/g, '-');
            if (!draftId) setDraftId(currentDraftId);

            const timer = setTimeout(() => {
                saveDraft(currentDraftId, step, formData)
                    .catch(err => console.error("Auto-save failed", err));
            }, 2000); // Debounce saves

            return () => clearTimeout(timer);
        }
    }, [step, formData, draftId]);

    // Load Draft on Mount if name exists (simple lookup)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const resumeId = searchParams.get('resume');
        if (resumeId) {
            loadDraft(resumeId).then(draft => {
                if (draft) {
                    setFormData(draft.formData);
                    setStep(draft.step);
                    setDraftId(draft.id);
                }
            });
        }
    }, []);

    // Derived teams for the current user
    const userTeams = allTeams.filter((t: any) => user?.teams.includes(t.id));

    // Validations
    const isNameDuplicate = validateProductName(formData.name);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // Dynamic Step Management
    const stepsConf = intent === 'new'
        ? ['Identity', 'Contract', 'Security', 'Fine-Grained', 'Configuration', 'Review']
        : ['Contract', 'Fine-Grained', 'Configuration', 'Review']; // Existing skips Identity/Security

    // Adjust current visual step index (0-based) for progress bar
    // If intent=new, step 1 is index 0. If intent=existing, step 1 (Contract) is index 0.
    // Our internal 'step' state:
    // 0: Intent
    // 1: Identity (New Only)
    // 2: Contract
    // 3: Security (New Only)
    // 4: Fine-Grained
    // 5: Fulfillment

    const getVisualStep = () => {
        if (step === 0) return 0;
        if (intent === 'new') {
            return step;
        } else {
            // Existing Flow Mappings:
            // Internal 2 (Contract) -> Visual 1
            // Internal 4 (Fine) -> Visual 2
            // Internal 5 (Resolution) -> Visual 3
            // Internal 6 (Fulfill) -> Visual 4
            if (step === 2) return 1;
            if (step === 4) return 2;
            if (step === 5) return 3;
            if (step === 6) return 4;
            return 1;
        }
    };

    // --- Navigation Handlers ---
    const handleIntentSelect = (selectedIntent: 'new' | 'existing', product?: Product) => {
        setIntent(selectedIntent);
        if (selectedIntent === 'existing' && product) {
            setExistingProduct(product);
            setFormData(prev => ({
                ...prev,
                name: product.name, // Inherit
                ownerTeamId: product.ownerTeamId // Inherit
            }));
            fetchConfiguration(product.id);
            setStep(2); // Jump to Contract
        } else {
            setStep(1); // Go to Identity
        }
    };

    const handleNext = () => {
        if (step === 1 && isNameDuplicate) return;

        let nextStep = step + 1;

        // MERGE STEP 3 & 4: Skip standalone Product Policy step
        if (step === 2) {
            nextStep = 4; // Jump straight to Unified Policy Studio
        }

        // Skip logic for Existing flow (Already handled by above but good to keep explicit)
        if (intent === 'existing') {
            if (step === 2) nextStep = 4;
        }
        setStep(nextStep);
    };

    const handleBack = () => {
        let prevStep = step - 1;

        // MERGE STEP 3 & 4: Back from Unified Studio goes to Spec
        if (step === 4) {
            prevStep = 2;
        }

        if (intent === 'existing') {
            if (step === 4) prevStep = 2; // Skip back to Contract
            if (step === 2) prevStep = 0; // Back to Intent
        }
        setStep(prevStep);
    };

    const handleSubmit = async () => {
        setSubmissionError(null);
        // Simulate API Call
        try {
            // Include policies in payload
            console.log("Submitting:", { ...formData, intent, existingProductId: existingProduct?.id });

            alert(`Product "${formData.name}" has been ${intent === 'new' ? 'registered' : 'updated'} and is pending Cloud Ops validation.`);
            navigate('/');
        } catch (err) {
            setSubmissionError("Failed to register product. Please try again.");
        }
    };

    return (
        <MainLayout>
            <div className="py-16">
                <div className={`${step === 2 || step === 3 || step === 4 ? 'max-w-[1400px]' : 'max-w-3xl'} mx-auto px-6 transition-all duration-500 ease-in-out`}>

                    {step > 0 && (
                        <OnboardingProgressBar currentStep={getVisualStep()} totalSteps={stepsConf.length} />
                    )}

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden min-h-[850px] flex flex-col">

                        {/* Step 0: Intent (Modal embedded) */}
                        {step === 0 && (
                            <OnboardingIntentModal
                                onSelectIntent={handleIntentSelect}
                                userTeams={userTeams}
                            />
                        )}

                        {/* Step 1: Identity (New Only) */}
                        {step === 1 && intent === 'new' && (
                            <OnboardingIdentityStep
                                onNext={handleNext}
                                isNameDuplicate={isNameDuplicate}
                                formData={formData}
                                onChange={setFormData}
                                userTeams={userTeams}
                                environment="DEV"
                            />
                        )}

                        {/* Step 2: Contract Definition */}
                        {step === 2 && (
                            <OnboardingSpecStep
                                onBack={handleBack}
                                onNext={(spec, apiName, apiSuffix) => {
                                    setFormData({ ...formData, specContent: spec, apiName, apiSuffix });
                                    handleNext();
                                }}
                                initialSpec={formData.specContent}
                                initialApiName={formData.apiName}
                                initialApiSuffix={formData.apiSuffix}
                            />
                        )}

                        {/* Step 3: Skipped (Merged into Step 4) */}

                        {/* Step 4: Unified Policy Studio */}
                        {step === 4 && (
                            <OnboardingApiPolicyStep
                                onBack={handleBack}
                                onNext={(apiPolicies, productPolicyXml) => {
                                    // Capture both API and Product policies
                                    setFormData({
                                        ...formData,
                                        apiPolicies,
                                        productPolicy: productPolicyXml ? { xml: productPolicyXml } : formData.productPolicy
                                    });
                                    handleNext();
                                }}
                                specContent={formData.specContent}
                                productName={formData.name} // Pass Product Name for Tree View
                                productPolicyXml={formData.productPolicy?.xml} // Pass initial product policy
                                initialApiPolicies={formData.apiPolicies}
                            />
                        )}

                        {/* Step 5: Resolution */}
                        {step === 5 && (
                            <OnboardingResolutionStep
                                productPolicyXml={formData.productPolicy?.xml || ''} // Handle complex object structure from Step 3
                                apiPolicies={formData.apiPolicies || {}}
                                existingNamedValues={(products.find(p => p.id === existingProduct?.id)?.namedValues || []).map(nv => ({
                                    name: nv.systemName,
                                    value: nv.value
                                }))}
                                onBack={handleBack}
                                onNext={(resolvedValues) => {
                                    setFormData({ ...formData, namedValues: resolvedValues });
                                    handleNext();
                                }}
                            />
                        )}

                        {/* Step 6: Fulfillment */}
                        {step === 6 && (
                            <OnboardingFulfillmentStep
                                onBack={handleBack}
                                onSubmit={handleSubmit}
                                productName={formData.name}
                                productVersion={formData.version}
                                apiName={formData.apiName}
                                apiSuffix={formData.apiSuffix}
                                teamId={formData.ownerTeamId}
                                setTeamId={(id) => setFormData({ ...formData, ownerTeamId: id })}
                                isPublic={formData.visibility === 'public'}
                                setIsPublic={(pub) => setFormData({ ...formData, visibility: pub ? 'public' : 'private' })}
                                projectKey=""
                                setProjectKey={() => { }}
                            />
                        )}

                        {/* Submission Error Toast */}
                        {submissionError && (
                            <div className="absolute top-6 right-6 p-4 bg-red-500 text-white rounded-xl shadow-xl animate-fade-in font-bold text-sm">
                                ⚠️ {submissionError}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};
