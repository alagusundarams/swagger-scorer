import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { OnboardingProgressBar } from '../components/OnboardingProgressBar';
import { OnboardingStepIdentity } from '../components/OnboardingStepIdentity';
import { OnboardingStepVisibility } from '../components/OnboardingStepVisibility';
import { OnboardingStepReview } from '../components/OnboardingStepReview';
import '../provisioning.css';


export const OnboardingWizard = () => {
    const navigate = useNavigate();

    // --- Store Integration ---
    const { user, teams: allTeams, setPageTitle } = useStore();

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
    });

    // Derived teams for the current user
    const userTeams = allTeams.filter(t => user?.teams.includes(t.id));

    // --- Navigation Handlers ---
    const handleNext = () => setStep(step + 1);
    const handleBack = () => setStep(step - 1);

    const handleSubmit = () => {
        alert(`Product "${formData.name}" has been registered and is pending Cloud Ops validation.`);
        navigate('/');
    };

    return (
        <MainLayout>
            <div className="py-16">
                <div className="max-w-3xl mx-auto px-6">
                    <OnboardingProgressBar currentStep={step} totalSteps={3} />

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] p-12 md:p-16 shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden">
                        {step === 1 && (
                            <OnboardingStepIdentity
                                formData={formData}
                                onChange={setFormData}
                                onNext={handleNext}
                                userTeams={userTeams}
                            />
                        )}

                        {step === 2 && (
                            <OnboardingStepVisibility
                                formData={formData}
                                onChange={setFormData}
                                onNext={handleNext}
                                onBack={handleBack}
                                allTeams={allTeams}
                            />
                        )}

                        {step === 3 && (
                            <OnboardingStepReview
                                formData={formData}
                                userTeams={userTeams}
                                onBack={handleBack}
                                onSubmit={handleSubmit}
                            />
                        )}
                    </div>
                </div>
            </div>
        </MainLayout>
    );
};

