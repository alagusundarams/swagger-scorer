import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { useInventoryStore } from '../../inventory/hooks/useInventoryStore';
import { useTeamsStore } from '../../teams/store/teamsStore';
import { OnboardingProgressBar } from '../components/OnboardingProgressBar';
import { OnboardingIdentityStep } from '../components/OnboardingIdentityStep';
import { OnboardingFulfillmentStep } from '../components/OnboardingFulfillmentStep';
import { OnboardingSpecStep } from '../components/OnboardingSpecStep';
import '../provisioning.css';


export const OnboardingWizard = () => {
    const navigate = useNavigate();

    // --- Store Integration ---
    const { user, setPageTitle } = useStore();
    const { products: allProducts } = useInventoryStore();
    const { teams: allTeams } = useTeamsStore();

    useEffect(() => {
        setPageTitle('Onboard Product');
    }, [setPageTitle]);

    // --- Wizard State ---
    const [step, setStep] = useState(1);
    const [formData, setFormData] = useState({
        name: '',
        version: '',
        description: '',
        ownerTeamId: user?.teams[0] || '',
        visibility: 'public' as 'public' | 'private' | 'owner-only',
        selectedTeams: [] as string[],
        requiresAuth: false,
        specContent: '' // Store the raw OpenAPI spec
    });

    // Derived teams for the current user
    const userTeams = allTeams.filter((t: any) => user?.teams.includes(t.id));

    // Validations
    const isNameDuplicate = allProducts.some(p => p.name.toLowerCase() === formData.name.toLowerCase() || p.displayName.toLowerCase() === formData.name.toLowerCase());
    const [submissionError, setSubmissionError] = useState<string | null>(null);

    // --- Navigation Handlers ---
    const handleNext = () => {
        if (step === 1 && isNameDuplicate) return;
        setStep(step + 1);
    };
    const handleBack = () => setStep(step - 1);

    const handleSubmit = async () => {
        setSubmissionError(null);
        // Simulate API Call
        try {
            // await createProduct(formData); 
            // For now, we simulate success
            alert(`Product "${formData.name}" has been registered and is pending Cloud Ops validation.`);
            navigate('/');
        } catch (err) {
            setSubmissionError("Failed to register product. Please try again.");
        }
    };

    return (
        <MainLayout>
            <div className="py-16">
                <div className={`${step === 2 ? 'max-w-[1400px]' : 'max-w-3xl'} mx-auto px-6 transition-all duration-500 ease-in-out`}>
                    <OnboardingProgressBar currentStep={step} totalSteps={3} />

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden min-h-[600px] flex flex-col">

                        {/* Step 1: Identity */}
                        {step === 1 && (
                            <OnboardingIdentityStep
                                onNext={handleNext}
                                isNameDuplicate={isNameDuplicate}
                                formData={formData}
                                onChange={setFormData}
                                userTeams={userTeams}
                                environment="DEV"
                            />
                        )}

                        {/* Step 2: Contract Definition (Advanced) */}
                        {step === 2 && (
                            <OnboardingSpecStep
                                onBack={handleBack}
                                onNext={(spec) => {
                                    setFormData({ ...formData, specContent: spec });
                                    setStep(3);
                                }}
                            />
                        )}

                        {/* Step 3: Fulfillment */}
                        {step === 3 && (
                            <OnboardingFulfillmentStep
                                onBack={handleBack}
                                onSubmit={handleSubmit}
                                productName={formData.name}
                                productVersion={formData.version}
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

