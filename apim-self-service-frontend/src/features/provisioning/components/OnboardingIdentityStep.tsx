import React from 'react';
import type { Team } from '../../../shared/types/domain';

export interface OnboardingIdentityStepProps {
    formData: {
        name: string;
        version: string;
        description: string;
        ownerTeamId: string;
    };
    onChange: (data: any) => void;
    onNext: () => void;
    userTeams: Team[];
    environment: string;
    isNameDuplicate?: boolean;
}

/**
 * Onboarding Step: Identity & Ownership
 */
export const OnboardingIdentityStep: React.FC<OnboardingIdentityStepProps> = ({
    formData,
    onChange,
    onNext,
    userTeams,
    environment,
    isNameDuplicate
}) => {
    return (
        <div className="animate-fade-in text-slate-900 dark:text-white p-10 flex-1 flex flex-col">
            <div className="mb-12">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4">Step 1: Identity</p>
                <h2 className="text-4xl font-black tracking-tighter mb-2">Establish Identity</h2>
                <p className="text-gray-400 font-medium">Define the core attributes of your new API Product.</p>
            </div>

            <div className="space-y-10 flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Name</label>
                        <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => onChange({ ...formData, name: e.target.value })}
                            className={`w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-2 rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all ${isNameDuplicate ? 'border-red-500 text-red-500' : 'border-transparent'}`}
                            placeholder="e.g. Payments_Gateway"
                        />
                        {isNameDuplicate && <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">Error: This name is already taken in {environment}</p>}
                        {formData.name && !/^[a-zA-Z0-9-_]+$/.test(formData.name) && (
                            <p className="text-[10px] font-bold text-red-500 uppercase tracking-widest ml-1">
                                Invalid Name: Use only alphanumeric, dashes, or underscores.
                            </p>
                        )}
                    </div>

                    <div className="space-y-3">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Initial Version</label>
                        <input
                            type="text"
                            value={formData.version}
                            onChange={(e) => onChange({ ...formData, version: e.target.value })}
                            className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                            placeholder="v1.0.0"
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Product Description</label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => onChange({ ...formData, description: e.target.value })}
                        className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg focus:ring-4 focus:ring-blue-500/10 outline-none transition-all resize-none h-32"
                        placeholder="Describe your product..."
                    />
                </div>

                <div className="space-y-3">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Owner Team</label>
                    <select
                        value={formData.ownerTeamId}
                        onChange={(e) => onChange({ ...formData, ownerTeamId: e.target.value })}
                        className="w-full px-8 py-5 bg-gray-50 dark:bg-slate-900 border-none rounded-2xl font-bold text-lg appearance-none focus:ring-4 focus:ring-blue-500/10 outline-none transition-all"
                    >
                        <option value="">Select Ownership Group</option>
                        {userTeams.map(team => (
                            <option key={team.id} value={team.id}>{team.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="flex justify-between items-center mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                <div className="text-gray-300 font-black text-[10px] uppercase tracking-widest">
                    Baseline Validation Active
                </div>
                <button
                    onClick={onNext}
                    disabled={!formData.name || !formData.ownerTeamId || !/^[a-zA-Z0-9-_]+$/.test(formData.name)}
                    className="px-12 py-5 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all shadow-premium disabled:opacity-30 disabled:cursor-not-allowed"
                >
                    Establish Identity
                </button>
            </div>
        </div>
    );
};
