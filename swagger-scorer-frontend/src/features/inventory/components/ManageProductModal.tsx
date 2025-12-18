import React, { useState } from 'react';
import { useStore } from '../../../store/useStore';
import { TeamSearch } from '../../provisioning/components/TeamSearch';

interface ManageProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: any;
    currentStage: 'DEV' | 'QA' | 'PROD';
    onPromote: () => void;
    onUpdate: (data: any) => void;
}

export const ManageProductModal = ({
    isOpen,
    onClose,
    product,
    currentStage,
    onPromote,
    onUpdate
}: ManageProductModalProps) => {
    // --- Store Content ---
    const { teams: allTeams } = useStore();

    // --- Local State ---
    const [activeTab, setActiveTab] = useState<'metadata' | 'access'>('metadata');
    const [formData, setFormData] = useState({
        displayName: product.displayName,
        description: product.description,
        version: product.version,
        authorizedTeams: [] as string[] // Simulated existing permissions
    });

    const isMetadataLocked = currentStage !== 'DEV';

    // In a real app, 'Access' might be editable in PROD, but let's assume it's governed too for now,
    // OR allow it ("Edit Later" requirement implies it IS editable in Prod). 
    // Let's make Access ALWAYS editable for the Product Owner, but logged.
    const isAccessLocked = false;

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 w-full max-w-2xl rounded-[2rem] shadow-2xl border border-white/10 overflow-hidden relative flex flex-col max-h-[90vh]">

                {/* Header with Stage Indicator */}
                <div className="p-8 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center bg-gray-50/50 dark:bg-slate-900/50">
                    <div>
                        <h2 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-widest flex items-center gap-3">
                            <span className="text-2xl">⚙️</span> Governance Control
                        </h2>
                        <p className="text-xs text-slate-500 font-medium mt-1">Lifecycle Management & Metadata Standards</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Stage:</span>
                        <span className={`px-4 py-2 rounded-xl text-xs font-black border uppercase tracking-widest shadow-sm ${currentStage === 'DEV' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            currentStage === 'QA' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                'bg-emerald-100 text-emerald-700 border-emerald-200'
                            }`}>
                            {currentStage}
                        </span>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex px-8 border-b border-gray-100 dark:border-slate-700">
                    {[
                        { id: 'metadata', label: 'Core Metadata' },
                        { id: 'access', label: 'Visibility & Access' }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`py-4 px-6 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Locked State Notification (Only for Metadata Tab) */}
                {activeTab === 'metadata' && isMetadataLocked && (
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-b border-amber-100 dark:border-amber-800 px-8 py-4 flex items-center gap-4">
                        <span className="text-xl">🔒</span>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 dark:text-amber-500 uppercase tracking-widest">Strict View-Only Mode</p>
                            <p className="text-xs text-amber-700/70 dark:text-amber-400 font-medium">
                                Modifications are disabled in <strong>{currentStage}</strong>. To make changes, you must initiate a new version in DEV.
                            </p>
                        </div>
                    </div>
                )}

                <div className="p-8 overflow-y-auto custom-scrollbar">

                    {/* --- METADATA TAB --- */}
                    {activeTab === 'metadata' && (
                        <div className="space-y-6 mb-8 animate-fade-in">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                    disabled={isMetadataLocked}
                                    className={`w-full p-4 rounded-xl font-bold border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${isMetadataLocked
                                        ? 'bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed border-transparent'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:border-blue-400'
                                        }`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    disabled={isMetadataLocked}
                                    className={`w-full p-4 rounded-xl font-medium border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 h-32 resize-none ${isMetadataLocked
                                        ? 'bg-gray-100 dark:bg-slate-900 text-gray-500 cursor-not-allowed border-transparent'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:border-blue-400'
                                        }`}
                                />
                            </div>
                        </div>
                    )}

                    {/* --- ACCESS TAB --- */}
                    {activeTab === 'access' && (
                        <div className="animate-fade-in">
                            <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800/30">
                                <p className="text-[10px] uppercase tracking-widest font-black text-blue-600 dark:text-blue-400 mb-1">
                                    Dynamic Access Control
                                </p>
                                <p className="text-xs text-blue-700/70 dark:text-blue-400/70 font-medium">
                                    Granting access here takes effect immediately, even in Production. All changes are logged.
                                </p>
                            </div>

                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Authorized Consumers</label>
                            <TeamSearch
                                allTeams={allTeams}
                                selectedTeamIds={formData.authorizedTeams}
                                onToggleTeam={(id) => {
                                    const current = formData.authorizedTeams;
                                    if (current.includes(id)) {
                                        setFormData({ ...formData, authorizedTeams: current.filter(t => t !== id) });
                                    } else {
                                        setFormData({ ...formData, authorizedTeams: [...current, id] });
                                    }
                                }}
                            />
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex justify-end gap-4 pt-8 border-t border-gray-100 dark:border-slate-700 mt-8">
                        <button
                            onClick={onClose}
                            className="px-6 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-400 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all"
                        >
                            Close Panel
                        </button>

                        {/* Save Button (Always available if changes made, logic varies by tab) */}
                        {((activeTab === 'metadata' && !isMetadataLocked) || activeTab === 'access') && (
                            <button
                                onClick={() => onUpdate(formData)}
                                className="px-8 py-4 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-gray-900 dark:text-white hover:bg-gray-50 transition-all"
                            >
                                Save Changes
                            </button>
                        )}

                        {/* Promotion Actions */}
                        {activeTab === 'metadata' && (
                            !isMetadataLocked ? (
                                <button
                                    onClick={onPromote}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span>Promote to QA</span>
                                    <span>→</span>
                                </button>
                            ) : (
                                currentStage === 'QA' && (
                                    <button
                                        onClick={onPromote}
                                        className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                    >
                                        <span>INITIATE GOVERNANCE REVIEW</span>
                                        <span>→</span>
                                    </button>
                                )
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
