import React from 'react';
import { Team } from '../../../types/entities';
import { TeamSearch } from './TeamSearch';

interface OnboardingStepVisibilityProps {
    formData: {
        visibility: 'public' | 'private' | 'owner-only';
        selectedTeams: string[];
    };
    onChange: (data: any) => void;
    onNext: () => void;
    onBack: () => void;
    allTeams: Team[];
}

export const OnboardingStepVisibility: React.FC<OnboardingStepVisibilityProps> = ({
    formData,
    onChange,
    onNext,
    onBack,
    allTeams
}) => {
    return (
        <div className="animate-fade-in">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Exposure Control</h2>
            <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Determine the reach and governance of your interface.</p>

            <div className="space-y-6">
                {[
                    { id: 'public', label: 'Ecosystem Public', desc: 'Discoverable by all enterprise units', icon: '🌐' },
                    { id: 'private', label: 'Restricted Circle', desc: 'Only visible to specific authorized groups', icon: '🔒' },
                    { id: 'owner-only', label: 'Internal Sandbox', desc: 'Strictly limited to the producing team', icon: '👤' }
                ].map(opt => (
                    <label
                        key={opt.id}
                        className={`flex items-start p-6 rounded-[2rem] cursor-pointer transition-all border-2 group ${formData.visibility === opt.id ? 'bg-blue-50/30 border-blue-600/30 dark:bg-blue-900/10 dark:border-blue-800' : 'bg-gray-50/50 dark:bg-slate-900/50 border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-blue-200'}`}
                    >
                        <input
                            type="radio"
                            name="visibility"
                            checked={formData.visibility === opt.id}
                            onChange={() => onChange({ ...formData, visibility: opt.id as any })}
                            className="mt-1.5 mr-5 w-5 h-5 text-blue-600 focus:ring-blue-500"
                        />
                        <div className="flex-1">
                            <div className="flex items-center gap-2 font-black text-gray-900 dark:text-white uppercase tracking-widest text-[11px]">
                                <span>{opt.icon}</span> {opt.label}
                            </div>
                            <div className="text-xs text-slate-400 font-medium mt-1 uppercase tracking-[0.05em]">{opt.desc}</div>

                            {formData.visibility === 'private' && opt.id === 'private' && (
                                <div className="mt-8 animate-fade-in">
                                    <TeamSearch
                                        allTeams={allTeams}
                                        selectedTeamIds={formData.selectedTeams}
                                        onToggleTeam={(toggelId) => {
                                            const current = formData.selectedTeams;
                                            if (current.includes(toggelId)) {
                                                onChange({ ...formData, selectedTeams: current.filter(id => id !== toggelId) });
                                            } else {
                                                onChange({ ...formData, selectedTeams: [...current, toggelId] });
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                    </label>
                ))}
            </div>

            <div className="flex justify-between mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                <button
                    onClick={onBack}
                    className="px-10 py-5 bg-gray-50 dark:bg-slate-900 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all"
                >
                    ← Back
                </button>
                <button
                    onClick={onNext}
                    className="px-10 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all"
                >
                    Review Manifest →
                </button>
            </div>
        </div>
    );
};
