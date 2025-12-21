import React from 'react';
import { Team } from '../../../types/entities';

interface OnboardingStepReviewProps {
    formData: {
        name: string;
        version: string;
        ownerTeamId: string;
        visibility: string;
        selectedTeams: string[];
    };
    userTeams: Team[];
    onBack: () => void;
    onSubmit: () => void;
}

export const OnboardingStepReview: React.FC<OnboardingStepReviewProps> = ({
    formData,
    userTeams,
    onBack,
    onSubmit
}) => {
    return (
        <div className="animate-fade-in">
            <h2 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Final Manifest</h2>
            <p className="text-gray-400 dark:text-slate-500 font-medium mb-12">Verify the configuration before enterprise submission.</p>

            <div className="space-y-8">
                <div className="bg-slate-50/50 dark:bg-slate-900/50 rounded-3xl p-8 border border-gray-100 dark:border-slate-800">
                    <div className="grid grid-cols-2 gap-y-8 gap-x-12">
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">INTERFACE NAME</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white">{formData.name}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">VERSION BUILD</p>
                            <p className="text-sm font-black text-blue-600 font-mono tracking-widest">{formData.version}</p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">OWNERSHIP</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase">
                                {userTeams.find(t => t.id === formData.ownerTeamId)?.name}
                            </p>
                        </div>
                        <div>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">GOVERNANCE MODE</p>
                            <p className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tighter">
                                {formData.visibility === 'public' && '🌐 Global Discovery'}
                                {formData.visibility === 'private' && `🔒 Restricted List (${formData.selectedTeams.length})`}
                                {formData.visibility === 'owner-only' && '👤 Internal Node'}
                            </p>
                        </div>
                        <div className="col-span-2 border-t border-gray-200 dark:border-slate-700 pt-6 mt-2">
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                                INITIAL DEPLOYMENT TARGET <span className="bg-gray-200 text-gray-600 px-1.5 rounded-[4px] text-[9px]">LOCKED</span>
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800">1</div>
                                <div>
                                    <p className="text-sm font-black text-gray-900 dark:text-white">Development Environment</p>
                                    <p className="text-xs font-mono text-slate-400">East US 2 (Internal Network)</p>
                                </div>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-2 font-medium bg-blue-50 dark:bg-blue-900/10 p-3 rounded-xl border border-blue-100 dark:border-blue-800/20 inline-block">
                                ℹ️ Production promotion requires passing automated Quality Gates in the Pipeline.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-6 p-8 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-[2rem] items-center">
                    <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center text-xl shrink-0">⚠️</div>
                    <div>
                        <p className="text-[10px] font-black text-amber-800 dark:text-amber-500 uppercase tracking-widest mb-1">PROVISIONING DELAY</p>
                        <p className="text-xs text-amber-700/70 dark:text-amber-600/60 font-medium leading-relaxed">
                            Registry submission triggers an automated architectural review.
                            Asset will remain in "Pending" status for approximately 24 hours.
                        </p>
                    </div>
                </div>
            </div>

            <div className="flex justify-between mt-12 pt-8 border-t border-gray-50 dark:border-slate-700/30">
                <button
                    onClick={onBack}
                    className="px-10 py-5 bg-gray-50 dark:bg-slate-900 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all font-sans"
                >
                    ← Back
                </button>
                <button
                    onClick={onSubmit}
                    className="px-12 py-5 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-2xl hover:bg-emerald-700 shadow-2xl shadow-emerald-500/30 transition-all hover:scale-105 active:scale-95"
                >
                    Submit Registration
                </button>
            </div>
        </div>
    );
};
