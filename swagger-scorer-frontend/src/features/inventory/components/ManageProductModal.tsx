import { useState } from 'react';
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
        visibility: product.visibility || 'public' as 'public' | 'internal' | 'private' | 'owner-only',
        authorizedTeamsByEnv: product.authorizedTeamsByEnv || {
            DEV: [],
            QA: [],
            STAGE: [],
            PROD: []
        } as Record<'DEV' | 'QA' | 'STAGE' | 'PROD', string[]>
    });

    const [expandedEnv, setExpandedEnv] = useState<'DEV' | 'QA' | 'STAGE' | 'PROD' | null>('DEV');

    const isMetadataLocked = currentStage !== 'DEV';

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

                            {/* Visibility Selector */}
                            <div className="mb-6">
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Product Visibility</label>
                                <div className="space-y-2">
                                    {[
                                        {
                                            value: 'public',
                                            label: 'Public',
                                            icon: '🌍',
                                            description: 'Anyone can discover and request access'
                                        },
                                        {
                                            value: 'internal',
                                            label: 'Internal',
                                            icon: '🏢',
                                            description: 'All organization members can discover'
                                        },
                                        {
                                            value: 'private',
                                            label: 'Private',
                                            icon: '🔒',
                                            description: 'Only authorized teams can discover'
                                        },
                                        {
                                            value: 'owner-only',
                                            label: 'Owner Only',
                                            icon: '👑',
                                            description: 'Only product owner team can access'
                                        }
                                    ].map((option) => (
                                        <label
                                            key={option.value}
                                            className={`flex items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${formData.visibility === option.value
                                                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                                                : 'border-gray-200 dark:border-slate-700 hover:border-gray-300 dark:hover:border-slate-600'
                                                }`}
                                        >
                                            <input
                                                type="radio"
                                                name="visibility"
                                                value={option.value}
                                                checked={formData.visibility === option.value}
                                                onChange={(e) => setFormData({ ...formData, visibility: e.target.value as any })}
                                                className="sr-only"
                                            />
                                            <span className="text-2xl mr-3">{option.icon}</span>
                                            <div className="flex-1">
                                                <div className="font-bold text-gray-900 dark:text-white">{option.label}</div>
                                                <div className="text-xs text-gray-500 dark:text-slate-400">{option.description}</div>
                                            </div>
                                            {formData.visibility === option.value && (
                                                <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </label>
                                    ))}
                                </div>
                            </div>

                            {/* Environment-Scoped Team Authorization - Only show if Private visibility */}
                            {formData.visibility === 'private' && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Authorized Teams by Environment</label>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                                        Teams have different Azure AD groups per environment. Manage access separately for each stage.
                                    </p>

                                    {(['DEV', 'QA', 'STAGE', 'PROD'] as const).map((env, idx) => {
                                        const isExpanded = expandedEnv === env;
                                        const teamsInEnv = formData.authorizedTeamsByEnv[env] || [];
                                        const lockIcon = env === 'PROD' ? '🔒' : env === 'STAGE' ? '🔐' : '';

                                        return (
                                            <div key={env} className={`mb-3 border rounded-xl overflow-hidden ${env === 'PROD' ? 'border-red-200 dark:border-red-800' :
                                                    env === 'STAGE' ? 'border-amber-200 dark:border-amber-800' :
                                                        'border-gray-200 dark:border-slate-700'
                                                }`}>
                                                {/* Environment Header */}
                                                <button
                                                    type="button"
                                                    onClick={() => setExpandedEnv(isExpanded ? null : env)}
                                                    className={`w-full p-4 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-900 transition ${env === 'PROD' ? 'bg-red-50/50 dark:bg-red-900/10' :
                                                            env === 'STAGE' ? 'bg-amber-50/50 dark:bg-amber-900/10' :
                                                                'bg-gray-50/50 dark:bg-slate-900/50'
                                                        }`}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-lg">{lockIcon || '📂'}</span>
                                                        <div className="text-left">
                                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{env}</div>
                                                            <div className="text-xs text-gray-500 dark:text-slate-400">
                                                                {teamsInEnv.length} team{teamsInEnv.length !== 1 ? 's' : ''} authorized
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <svg
                                                        className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                                        fill="none"
                                                        viewBox="0 0 24 24"
                                                        stroke="currentColor"
                                                    >
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </button>

                                                {/* Environment Content */}
                                                {isExpanded && (
                                                    <div className="p-4 border-t border-gray-100 dark:border-slate-700">
                                                        {/* Copy from lower env button (except for DEV) */}
                                                        {idx > 0 && (
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const lowerEnv = (['DEV', 'QA', 'STAGE', 'PROD'] as const)[idx - 1];
                                                                    setFormData({
                                                                        ...formData,
                                                                        authorizedTeamsByEnv: {
                                                                            ...formData.authorizedTeamsByEnv,
                                                                            [env]: [...(formData.authorizedTeamsByEnv[lowerEnv] || [])]
                                                                        }
                                                                    });
                                                                }}
                                                                className="mb-3 text-xs px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                                </svg>
                                                                Copy from {(['DEV', 'QA', 'STAGE', 'PROD'] as const)[idx - 1]}
                                                            </button>
                                                        )}

                                                        {/* Team Search */}
                                                        <TeamSearch
                                                            allTeams={allTeams}
                                                            selectedTeamIds={teamsInEnv}
                                                            onToggleTeam={(id) => {
                                                                const current = formData.authorizedTeamsByEnv[env] || [];
                                                                if (current.includes(id)) {
                                                                    setFormData({
                                                                        ...formData,
                                                                        authorizedTeamsByEnv: {
                                                                            ...formData.authorizedTeamsByEnv,
                                                                            [env]: current.filter((t: string) => t !== id)
                                                                        }
                                                                    });
                                                                } else {
                                                                    setFormData({
                                                                        ...formData,
                                                                        authorizedTeamsByEnv: {
                                                                            ...formData.authorizedTeamsByEnv,
                                                                            [env]: [...current, id]
                                                                        }
                                                                    });
                                                                }
                                                            }}
                                                        />
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
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
