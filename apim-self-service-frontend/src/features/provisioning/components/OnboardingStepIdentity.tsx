import React from 'react';
import { Team } from '../../../types/entities';
import { Typeahead } from '../../../components/ui/Typeahead';

interface OnboardingStepIdentityProps {
    formData: {
        name: string;
        version: string;
        description: string;
        ownerTeamId: string;
    };
    onChange: (data: any) => void;
    onNext: () => void;
    userTeams: Team[];
}

export const OnboardingStepIdentity: React.FC<OnboardingStepIdentityProps> = ({
    formData,
    onChange,
    onNext,
    userTeams
}) => {
    return (
        <div className="animate-fade-in">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Product Identity</h2>
            <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Establish the core metadata for your API interface.</p>

            <div className="space-y-8">
                <div className="group">
                    <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Marketplace Display Name *</label>
                    <input
                        type="text"
                        value={formData.name}
                        onChange={e => onChange({ ...formData, name: e.target.value })}
                        className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:bg-white dark:focus:bg-slate-950 focus:outline-none dark:text-white transition-all font-bold"
                        placeholder="e.g., Global Transactions API"
                    />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div>
                        <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Release Version *</label>
                        <input
                            type="text"
                            value={formData.version}
                            onChange={e => onChange({ ...formData, version: e.target.value })}
                            className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none dark:text-white transition-all font-mono text-sm"
                            placeholder="v1.0.0"
                        />
                    </div>
                    <div>
                        <Typeahead
                            label="Responsible Team *"
                            placeholder="Select a Team..."
                            options={userTeams.map(team => ({ id: team.id, label: team.name.toUpperCase() }))}
                            value={formData.ownerTeamId}
                            onChange={(val) => onChange({ ...formData, ownerTeamId: val })}
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-[10px] font-black text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-3 ml-1">Operational Description *</label>
                    <textarea
                        value={formData.description}
                        onChange={e => onChange({ ...formData, description: e.target.value })}
                        className="w-full px-6 py-5 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-800 rounded-2xl focus:border-blue-500 focus:outline-none dark:text-white transition-all font-medium min-h-[140px]"
                        placeholder="Summarize the core capabilities and value proposition..."
                    />
                </div>
            </div>

            <div className="flex justify-end mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                <button
                    onClick={onNext}
                    disabled={!formData.name || !formData.version || !formData.description}
                    className="px-10 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-blue-700 disabled:opacity-20 disabled:grayscale transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                >
                    Establish Identity →
                </button>
            </div>
        </div>
    );
};
