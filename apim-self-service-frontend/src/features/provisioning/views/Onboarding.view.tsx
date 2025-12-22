import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../../../layouts/MainLayout/MainLayout.view';
import { useStore } from '../../../store/useStore';
import { OnboardingProgressBar } from '../components/OnboardingProgressBar';
import { OnboardingPhase1Definition } from '../components/OnboardingPhase1Definition';
import { PolicyStudioContainer } from '../../policy-studio/PolicyStudio.container';
import { OnboardingPhase3Fulfillment } from '../components/OnboardingPhase3Fulfillment';
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

                    <div className="bg-white dark:bg-slate-800 rounded-[3rem] shadow-premium border border-gray-100 dark:border-slate-700/40 relative overflow-hidden min-h-[600px] flex flex-col">

                        {/* Phase 1: Definition */}
                        {step === 1 && (
                            <OnboardingPhase1Definition
                                onNext={() => setStep(2)}
                            />
                        )}

                        {/* Phase 2: Policy Studio (Visualizer) */}
                        {step === 2 && (
                            <div className="flex-1 flex flex-col h-[800px]"> {/* Fixed height for visualizer */}
                                <PolicyStudioContainer />
                                <div className="p-4 border-t border-gray-200 dark:border-slate-700 flex justify-between bg-white dark:bg-slate-800">
                                    <button
                                        onClick={handleBack}
                                        className="px-6 py-2 text-gray-500 font-bold hover:text-gray-900"
                                    >
                                        Back to Definition
                                    </button>
                                    <button
                                        onClick={() => setStep(3)}
                                        className="px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                                    >
                                        Continue to Review →
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Phase 3: Fulfillment */}
                        {step === 3 && (
                            <OnboardingPhase3Fulfillment
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

