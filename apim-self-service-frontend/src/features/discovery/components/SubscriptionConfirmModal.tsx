import React from 'react';
import { Product, Team } from '../../../types/entities';

interface SubscriptionConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    selectedProduct: Product | undefined;
    selectedTeamId: string;
    onTeamChange: (teamId: string) => void;
    userTeams: Team[];
}

export const SubscriptionConfirmModal: React.FC<SubscriptionConfirmModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    selectedProduct,
    selectedTeamId,
    onTeamChange,
    userTeams
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xl flex items-center justify-center z-50 p-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl transform scale-100 relative overflow-hidden">
                {/* Decorative background element */}
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-blue-600/10 rounded-full blur-3xl"></div>

                <div className="relative">
                    <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tighter mb-4 capitalize">Initiate Integration</h2>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mb-10 leading-relaxed">
                        Requesting access for <span className="text-blue-600 font-bold">{selectedProduct?.displayName}</span>.
                        Subscriptions require owner verification before keys are issued.
                    </p>

                    <div className="space-y-10">
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4 ml-1">
                                RECIPIENT CONSUMER TEAM
                            </label>
                            <select
                                value={selectedTeamId}
                                onChange={e => onTeamChange(e.target.value)}
                                className="w-full px-6 py-4 bg-gray-50 dark:bg-slate-900 border border-transparent dark:border-slate-700/50 rounded-2xl text-sm font-black focus:outline-none focus:ring-4 focus:ring-blue-600/10 transition-all"
                            >
                                {userTeams.map(team => (
                                    <option key={team.id} value={team.id}>
                                        {team.name.toUpperCase()}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-6">
                            <p className="text-xs text-amber-700 dark:text-amber-500 font-bold leading-relaxed">
                                ⚠️ GOVERNANCE ALERT: This action triggers an approval workflow. Expected processing time is ~24-48 business hours.
                            </p>
                        </div>

                        <div className="flex gap-4">
                            <button
                                onClick={onClose}
                                className="flex-1 px-8 py-5 border border-gray-100 dark:border-slate-700 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={onConfirm}
                                className="flex-[2] px-8 py-5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-500/30 transition-all"
                            >
                                Submit Request
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
