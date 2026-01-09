import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../store/useStore';
import { OnboardingProgressBar, OnboardingIdentityStep, OnboardingFulfillmentStep, OnboardingSpecStep, OnboardingApiPolicyStep, OnboardingIntentModal, OnboardingResolutionStep, OnboardingPrerequisitesStep, AppRegistrationGuide, saveDraft, loadDraft } from '../../features/provisioning';
import type { Product } from '../../features/inventory';
import type { NamedValue } from '../../shared/types/domain';

// Query Hooks
import { useMyTeamsQuery } from '../../features/provisioning/api/userQueries';
import { useNamedValuesQuery } from '../../features/inventory/api/inventoryQueries';

/**
 * OnboardingPage Controller (Visual Wizard v2)
 * 
 * Flow:
 * 0. Prerequisites (Enlightenment/Ready Check)
 * 1. Intent (New vs Existing)
 * 2. Identity (Skipped if Existing)
 * 3. Contract (Spec)
 * 4. Product Policy (Internal logic)
 * 5. API Policy (Studio)
 * 6. Resolution
 * 7. Fulfillment
 */
interface OnboardingWizardProps {
    validateProductName: (name: string) => boolean;
}

export const OnboardingWizard = ({ validateProductName }: OnboardingWizardProps) => {
    const navigate = useNavigate();

    // --- Store Integration ---
    const { user, setPageTitle } = useStore();

    // Replace Stores with Queries
    const { data: allTeams = [] } = useMyTeamsQuery();

    useEffect(() => {
        setPageTitle('Onboard Product');
    }, [setPageTitle]);

    // --- Wizard State Management ---
    const [step, setStep] = useState(0); // Internal step index (starts at 0: Intent Modal)
    const [intent, setIntent] = useState<'new' | 'existing'>('new'); // User intent: Create New vs Update Existing
    const [existingProduct, setExistingProduct] = useState<Product | undefined>(undefined);

    // Fetch configuration (Named Values) for existing product if applicable
    const { data: existingNamedValuesData = [] } = useNamedValuesQuery(existingProduct?.id || '');

    // Form Data State - Aggregates data across all wizard steps
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
    const [showGuide, setShowGuide] = useState(false);

    /**
     * --- Draft Persistence Logic ---
     * Automatically saves progress to local storage (or backend) every 2 seconds
     * to prevent data loss on browser refresh.
     */
    useEffect(() => {
        if (step > 0 && formData.name) {
            const currentDraftId = draftId || formData.name.toLowerCase().replace(/\s+/g, '-');
            if (!draftId) setDraftId(currentDraftId);

            const timer = setTimeout(() => {
                saveDraft(currentDraftId, step, formData)
                    .catch((err: Error) => console.error("Auto-save failed", err));
            }, 2000); // Debounce saves

            return () => clearTimeout(timer);
        }
    }, [step, formData, draftId]);

    // Load Draft on Mount if name exists (simple lookup via URL params)
    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const resumeId = searchParams.get('resume');
        if (resumeId) {
            loadDraft(resumeId).then((draft: any) => {
                if (draft) {
                    setFormData(draft.formData);
                    setStep(draft.step);
                    setDraftId(draft.id);
                }
            });
        }
    }, []);

    // Derived teams for the current user (filtered from all teams)
    const userTeams = allTeams.filter((t: any) => user?.teams.includes(t.id));

    // Validations: Check for duplicate product names
    const isNameDuplicate = validateProductName(formData.name);
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // Dynamic Step Configuration based on Intent
    const stepsConf = intent === 'new'
        ? ['Prep', 'Intent', 'Identity', 'Spec', 'Policies', 'Review']
        : ['Prep', 'Intent', 'Spec', 'Policies', 'Review'];

    /**
     * Helper: Map Internal Step Index to Visual Progress Bar Index
     * 
     * RATIONALE:
     * The internal `step` state tracks the strict logical flow (including modals).
     * The visual progress bar `getVisualStep()` normalizes this for the user,
     * merging related steps (e.g., Policy & Resolution) or skipping hidden ones.
     */
    const getVisualStep = () => {
        if (step <= 1) return step; // Prep and Intent
        if (intent === 'new') {
            // New Flow: 2(Identity)->2, 3(Spec)->3, 4(Policy)->4, 5(Res)->5, 6(Full)->6
            return step;
        } else {
            // Existing Flow: 3(Spec)->2, 4(Policy)->3, 5(Res)->4, 6(Full)->5
            if (step === 3) return 2;
            if (step === 4) return 3;
            if (step === 5) return 4;
            if (step === 6) return 5;
            return 2;
        }
    };

    // --- Navigation Handlers ---

    /**
     * Handler for Intent Selection (New vs Existing)
     * Sets up the wizard based on whether we are onboarding a fresh product
     * or modifying an existing one (which prefills data).
     */
    const handleIntentSelect = (selectedIntent: 'new' | 'existing', product?: Product) => {
        setIntent(selectedIntent);
        if (selectedIntent === 'existing' && product) {
            setExistingProduct(product);
            setFormData(prev => ({
                ...prev,
                name: product.name, // Inherit
                ownerTeamId: product.ownerTeamId // Inherit
            }));
            // Query hook automatically fetches when existingProduct is set
            setStep(3); // Jump to Contract (shifted)
        } else {
            setStep(2); // Go to Identity (shifted)
        }
    };

    /**
     * Advancement Logic
     * Handles step increments and conditional jumps (e.g., skipping Step 4).
     */
    const handleNext = () => {
        if (step === 2 && isNameDuplicate) return;

        let nextStep = step + 1;

        // Skip logic for Existing flow (Already handled by above but good to keep explicit)
        if (intent === 'existing') {
            if (step === 1) nextStep = 3; // Intent -> Spec
        }
        setStep(nextStep);
    };

    /**
     * Regression Logic
     * Handles step decrements and conditional jumps (reverse of handleNext).
     */
    const handleBack = () => {
        let prevStep = step - 1;

        if (intent === 'existing') {
            if (step === 3) prevStep = 1; // Back to Intent
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
                <div className={`${(step >= 3 && step <= 6) ? 'max-w-[1400px]' : 'max-w-5xl'} mx-auto px-6 transition-all duration-500 ease-in-out`}>

                    {step >= 0 && ( // Progress bar visible from step 0
                        <OnboardingProgressBar currentStep={getVisualStep()} totalSteps={stepsConf.length} />
                    )}

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden min-h-[850px] flex flex-col">

                        {/* Step 0: Prerequisites */}
                        {step === 0 && (
                            <OnboardingPrerequisitesStep onNext={() => setStep(1)} />
                        )}

                        {/* Step 1: Intent (Modal embedded) */}
                        {step === 1 && (
                            <OnboardingIntentModal
                                onSelectIntent={handleIntentSelect}
                                userTeams={userTeams}
                            />
                        )}

                        {/* Step 2: Identity (New Only) */}
                        {step === 2 && (
                            <OnboardingIdentityStep
                                onNext={handleNext}
                                isNameDuplicate={isNameDuplicate}
                                formData={formData}
                                intent={intent}
                                selectedProduct={existingProduct}
                                onChange={setFormData}
                                userTeams={userTeams}
                                environment="DEV"
                                onShowGuide={() => setShowGuide(true)}
                            />
                        )}

                        {/* Step 3: Contract Definition */}
                        {step === 3 && (
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

                        {/* Step 4: Skipped (Merged into Step 5) */}

                        {/* Step 4: Policy Studio (Consolidated from 4 & 5) */}
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
                                existingNamedValues={existingNamedValuesData.map((nv: NamedValue) => ({
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

            {/* Guide Slide-over */}
            {showGuide && <AppRegistrationGuide onClose={() => setShowGuide(false)} />}
        </MainLayout>
    );
};
