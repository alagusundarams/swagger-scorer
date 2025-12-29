import React from 'react';

interface OnboardingProgressBarProps {
    currentStep: number;
    totalSteps: number;
}

export const OnboardingProgressBar: React.FC<OnboardingProgressBarProps> = ({ currentStep, totalSteps }) => {
    return (
        <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
                {Array.from({ length: totalSteps }).map((_, i) => {
                    const stepNum = i + 1;
                    return (
                        <div
                            key={stepNum}
                            className={`flex-1 h-2 rounded-full mx-1.5 transition-all duration-700 ${stepNum <= currentStep ? 'bg-blue-600 shadow-lg shadow-blue-500/20' : 'bg-gray-100 dark:bg-slate-800'}`}
                        />
                    );
                })}
            </div>
            <p className="text-[10px] font-black text-gray-400 text-center uppercase tracking-[0.3em]">
                STEP {currentStep} <span className="opacity-30 inline-block mx-2">/</span> 0{totalSteps}
            </p>
        </div>
    );
};
