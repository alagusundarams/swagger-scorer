import React, { useState } from 'react';
import { AppRegistrationGuide } from './AppRegistrationGuide';

/**
 * ------------------------------------------------------------------
 * 📍 Component: OnboardingPrerequisitesStep
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Step 0: Enlighten the user before they begin.
 * - Ensures they have App Registration, Metadata, and Ownership ready.
 * - Provides an "off-ramp" for those not yet prepared.
 * ------------------------------------------------------------------
 */
interface OnboardingPrerequisitesStepProps {
    onNext: () => void;
}

export const OnboardingPrerequisitesStep: React.FC<OnboardingPrerequisitesStepProps> = ({ onNext }) => {
    const [confirmed, setConfirmed] = useState({
        identity: false,
        metadata: false,
        ownership: false
    });
    const [showGuide, setShowGuide] = useState(false);

    const isReady = confirmed.identity && confirmed.metadata && confirmed.ownership;

    const toggle = (key: keyof typeof confirmed) => {
        setConfirmed(prev => ({ ...prev, [key]: !prev[key] }));
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[850px] p-12 animate-fade-in bg-white dark:bg-slate-800">
            {/* Guide Slide-over */}
            {showGuide && <AppRegistrationGuide onClose={() => setShowGuide(false)} />}

            <div className="max-w-4xl w-full text-center mb-16">
                <div className="inline-block px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] mb-6">
                    Step 0: Preparation
                </div>
                <h1 className="text-5xl font-black tracking-tighter mb-4 text-slate-900 dark:text-white">
                    Get Ready for Onboarding
                </h1>
                <p className="text-lg text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto">
                    We're excited to help you manage your APIs effectively. Before we dive in,
                    let's ensure you have everything you need for a smooth setup.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-5xl mb-12">
                {/* Identity Card */}
                <div
                    onClick={() => toggle('identity')}
                    className={`group relative p-8 rounded-3xl border-2 transition-all cursor-pointer ${confirmed.identity ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200'}`}
                >
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 text-blue-500">
                        🔑
                    </div>
                    <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">Identity & Auth</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Secure your access. Have your team's Azure App Registration (Client ID & URI) ready.
                        <span className="block mt-2 text-xs">
                            Don't have one? <a href="#" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }} className="text-blue-500 underline font-bold">Raise a ServiceNow ticket</a>
                        </span>
                        <span className="block mt-2 font-medium text-emerald-600 dark:text-emerald-400">
                            💡 Joining an existing product? You might inherit their identity!
                        </span>
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${confirmed.identity ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 dark:border-slate-600'}`}>
                            {confirmed.identity && <span className="text-[10px]">✓</span>}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${confirmed.identity ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {confirmed.identity ? 'Ready' : 'Click to Confirm'}
                        </span>
                    </div>
                </div>

                {/* Metadata Card */}
                <div
                    onClick={() => toggle('metadata')}
                    className={`group relative p-8 rounded-3xl border-2 transition-all cursor-pointer ${confirmed.metadata ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200'}`}
                >
                    <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 text-purple-500">
                        📄
                    </div>
                    <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">Configuration</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Gather essential metadata like API specifications (OpenAPI/Swagger) and endpoint URLs.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${confirmed.metadata ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 dark:border-slate-600'}`}>
                            {confirmed.metadata && <span className="text-[10px]">✓</span>}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${confirmed.metadata ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {confirmed.metadata ? 'Ready' : 'Click to Confirm'}
                        </span>
                    </div>
                </div>

                {/* Ownership Card */}
                <div
                    onClick={() => toggle('ownership')}
                    className={`group relative p-8 rounded-3xl border-2 transition-all cursor-pointer ${confirmed.ownership ? 'border-emerald-500 bg-emerald-50/30 dark:bg-emerald-900/10' : 'border-slate-100 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm hover:border-blue-200'}`}
                >
                    <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-2xl flex items-center justify-center text-3xl mb-6 text-orange-500">
                        👥
                    </div>
                    <h3 className="text-xl font-black mb-3 text-slate-900 dark:text-white">Governance</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        Identify the team members responsible for API ownership, approvals, and lifecycle.
                    </p>
                    <div className="flex items-center gap-2">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center transition-all ${confirmed.ownership ? 'bg-emerald-500 text-white' : 'border-2 border-slate-200 dark:border-slate-600'}`}>
                            {confirmed.ownership && <span className="text-[10px]">✓</span>}
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${confirmed.ownership ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {confirmed.ownership ? 'Ready' : 'Click to Confirm'}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex flex-col items-center gap-6">
                <button
                    onClick={onNext}
                    disabled={!isReady}
                    className={`px-12 py-5 rounded-2xl font-black text-sm uppercase tracking-widest transition-all duration-300 ${isReady
                        ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95'
                        : 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'}`}
                >
                    {isReady ? 'Start My Journey' : 'Confirm Prerequisites to Start'}
                </button>

                <p className="text-sm text-slate-400 flex items-center gap-2">
                    Need help?
                    <button
                        onClick={() => setShowGuide(true)}
                        className="text-blue-500 hover:text-blue-600 font-bold underline decoration-blue-500/30 underline-offset-4 decoration-2 transition-all"
                    >
                        Read the Onboarding Guide
                    </button>
                </p>
            </div>
        </div>
    );
};
