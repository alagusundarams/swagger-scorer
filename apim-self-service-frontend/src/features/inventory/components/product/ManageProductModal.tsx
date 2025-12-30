import { useState } from 'react';
import { useStore } from '../../../../store/useStore';
import { useAppData } from '../../../../shared/context/AppDataContext';
import { TeamSearch } from '../../../../features/provisioning/components/TeamSearch';
import { type Product } from '../../types/inventoryTypes';

interface ManageProductModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    currentStage: 'DEV' | 'QA' | 'STAGE' | 'PROD';
    onPromote: () => void;
    onUpdate: (data: Partial<Product>) => void;
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
    const { user, addNotification } = useStore();
    /** MFE-Compliant: Read-only access to teams via shared context */
    const { teams: allTeams } = useAppData();

    // --- Local State ---
    const [activeTab, setActiveTab] = useState<'metadata' | 'access'>('metadata');

    // Ensure we have a default structure for local state to avoid 'undefined' checks
    const [formData, setFormData] = useState<Required<Pick<Product, 'displayName' | 'description' | 'version' | 'visibility' | 'authorizedTeams'>>>({
        displayName: product.displayName || '',
        description: product.description || '',
        version: product.version || '1.0.0',
        visibility: product.visibility || 'public',
        authorizedTeams: product.authorizedTeams || []
    });

    const [localToast, setLocalToast] = useState<{ message: string; type: 'success' | 'warning' } | null>(null);
    const [isRequestingApproval, setIsRequestingApproval] = useState(false);


    // --- Governance Logic ---
    const isOwnerLead = user?.leadsTeams.includes(product.ownerTeamId) || user?.role === 'admin';

    // Allow metadata editing in all environments, but track changes for re-promotion
    const isMetadataChanged = formData.displayName !== product.displayName || formData.description !== product.description || formData.version !== product.version;
    const requiresRepromotion = isMetadataChanged && (currentStage === 'PROD' || currentStage === 'STAGE');

    const isVisibilityChanged = formData.visibility !== product.visibility;
    const isAccessChanged = JSON.stringify(formData.authorizedTeams) !== JSON.stringify(product.authorizedTeams);
    const requiresApproval = (isVisibilityChanged || isAccessChanged) && currentStage === 'PROD';


    const getImpactSummary = () => {
        if (formData.visibility === product.visibility) return null;
        if (formData.visibility === 'private' && product.visibility === 'public') {
            return {
                message: "Switching to Private will immediately hide this product from the public catalog. Access will be strictly limited to authorized teams; existing subscribers not in the authorized list for this environment will lose access immediately.",
                type: 'warning' as const
            };
        }
        if (formData.visibility === 'owner-only') {
            return {
                message: "Owner Only visibility will eventually revoke access for all non-owner teams. Use with caution.",
                type: 'warning' as const
            };
        }
        return null;
    };

    const impact = getImpactSummary();

    const handleSave = () => {
        if (!isOwnerLead) {
            setLocalToast({ message: 'Authorization Failed: Only Team Leads or Architects can modify governance.', type: 'warning' });
            return;
        }

        if (requiresApproval) {
            setIsRequestingApproval(true);
            setTimeout(() => {
                setLocalToast({ message: 'Approval Request Submitted: Security vetting initiated for Production visibility change.', type: 'success' });
                addNotification({
                    type: 'governance',
                    title: 'PROD Approval Requested',
                    message: `Visibility change for ${product.displayName} submitted for security vetting.`,
                    navigateTo: '/'
                });
                setIsRequestingApproval(false);
                onUpdate(formData); // Mocking update after "request"
            }, 1000);
            return;
        }

        onUpdate(formData);

        // Proactive Intimation for non-prod changes
        if (isVisibilityChanged || isAccessChanged) {
            addNotification({
                type: 'info',
                title: 'Governance Updated',
                message: `${user?.name} updated visibility settings for ${product.displayName} in ${currentStage}.`,
                navigateTo: '/'
            });
        }

        setLocalToast({ message: 'Governance settings saved successfully!', type: 'success' });
        setTimeout(() => setLocalToast(null), 3000);
    };

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
                        {/* Management Mode Badge */}
                        {product.managementMode && product.managementMode !== 'PORTAL_MANAGED' && (
                            <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${product.managementMode === 'TERRAFORM_MANAGED'
                                ? 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
                                : 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
                                }`}>
                                {product.managementMode === 'TERRAFORM_MANAGED' ? '🔴' : '🟡'}
                                {product.managementMode === 'TERRAFORM_MANAGED' ? 'Terraform' : 'Hybrid'}
                            </span>
                        )}

                        {/* Environment Stage Badge */}
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Current Stage:</span>
                        <span className={`px-4 py-2 rounded-xl text-xs font-black border uppercase tracking-widest shadow-sm ${currentStage === 'DEV' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                            currentStage === 'QA' ? 'bg-cyan-100 text-cyan-700 border-cyan-200' :
                                currentStage === 'STAGE' ? 'bg-amber-100 text-amber-700 border-amber-200' :
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

                {/* Re-Promotion Warning (Only for Metadata Tab in PROD/STAGE) */}
                {activeTab === 'metadata' && requiresRepromotion && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800 px-8 py-4 flex items-center gap-4">
                        <span className="text-xl">🔄</span>
                        <div>
                            <p className="text-[10px] font-black text-blue-600 dark:text-blue-500 uppercase tracking-widest">Re-Promotion Required</p>
                            <p className="text-xs text-blue-700/70 dark:text-blue-400 font-medium">
                                Changes to <strong>{currentStage}</strong> products require re-promotion through the full lifecycle (DEV → QA → STAGE → PROD).
                            </p>
                        </div>
                    </div>
                )}

                <div className="p-8 overflow-y-auto custom-scrollbar relative">
                    {/* Floating Local Toast */}
                    {localToast && (
                        <div className={`absolute top-4 left-8 right-8 p-3 rounded-xl border flex items-center gap-3 animate-slide-up z-20 ${localToast.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-amber-50 border-amber-100 text-amber-700'
                            }`}>
                            <span>{localToast.type === 'success' ? '✨' : '⚠️'}</span>
                            <span className="text-xs font-bold uppercase tracking-widest">{localToast.message}</span>
                        </div>
                    )}

                    {/* --- METADATA TAB --- */}
                    {activeTab === 'metadata' && (
                        <div className="space-y-6 mb-8 animate-fade-in">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Display Name</label>
                                <input
                                    type="text"
                                    value={formData.displayName}
                                    onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                                    disabled={product.managementMode === 'TERRAFORM_MANAGED'}
                                    className={`w-full p-4 rounded-xl font-bold border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 ${product.managementMode === 'TERRAFORM_MANAGED'
                                        ? 'bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-600  cursor-not-allowed border-gray-200 dark:border-slate-800'
                                        : 'bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-white hover:border-blue-400'
                                        }`}
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    disabled={product.managementMode === 'TERRAFORM_MANAGED'}
                                    className={`w-full p-4 rounded-xl font-medium border transition-all outline-none focus:ring-2 focus:ring-blue-500/20 h-32 resize-none ${product.managementMode === 'TERRAFORM_MANAGED'
                                        ? 'bg-gray-100 dark:bg-slate-900 text-gray-500 dark:text-slate-600 cursor-not-allowed border-gray-200 dark:border-slate-800'
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

                            {/* Impact Warning */}
                            {impact && (
                                <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-800/30 flex items-start gap-3">
                                    <span className="text-xl">⚠️</span>
                                    <div>
                                        <p className="text-[10px] uppercase tracking-widest font-black text-amber-600 dark:text-amber-500 mb-1">Impact Warning</p>
                                        <p className="text-xs text-amber-700 dark:text-amber-400 font-medium leading-relaxed">{impact.message}</p>
                                    </div>
                                </div>
                            )}

                            {/* Team Authorization - Only show if Private visibility */}
                            {formData.visibility === 'private' && (
                                <div className="space-y-4">
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 ml-1">Authorized Teams</label>
                                    <p className="text-xs text-gray-500 dark:text-slate-400 mb-4">
                                        Grant discovery and subscription rights to specific teams for this <strong>{currentStage}</strong> deployment.
                                    </p>

                                    <div className="border border-gray-200 dark:border-slate-700 rounded-2xl p-4 bg-gray-50/30 dark:bg-slate-900/40">
                                        <TeamSearch
                                            allTeams={allTeams}
                                            selectedTeams={formData.authorizedTeams}
                                            onToggleTeam={(id: string) => {
                                                const current = formData.authorizedTeams;
                                                setFormData({
                                                    ...formData,
                                                    authorizedTeams: current.includes(id)
                                                        ? current.filter(t => t !== id)
                                                        : [...current, id]
                                                });
                                            }}
                                        />
                                    </div>
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

                        {/* Save Button - Hidden for Terraform mode */}
                        {product.managementMode !== 'TERRAFORM_MANAGED' && ((activeTab === 'metadata' && isMetadataChanged) || (activeTab === 'access' && (isVisibilityChanged || isAccessChanged))) && (
                            <button
                                onClick={handleSave}
                                disabled={isRequestingApproval || (!isOwnerLead && activeTab === 'access')}
                                className={`px-8 py-4 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${isRequestingApproval ? 'bg-gray-100 text-gray-400 cursor-wait' :
                                    !isOwnerLead && activeTab === 'access' ? 'bg-gray-100 text-gray-400 cursor-not-allowed border-gray-200' :
                                        requiresApproval
                                            ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/20 hover:bg-amber-700'
                                            : 'bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 text-gray-900 dark:text-white hover:bg-gray-50'
                                    }`}
                            >
                                {isRequestingApproval ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        Processing...
                                    </>
                                ) : (
                                    <>
                                        {requiresApproval ? '🛡️ Request PROD Approval' : (!isOwnerLead && activeTab === 'access' ? '🔒 Lead Only' : 'Save Changes')}
                                    </>
                                )}
                            </button>
                        )}

                        {/* Promotion Actions */}
                        {activeTab === 'metadata' && (
                            currentStage === 'DEV' ? (
                                <button
                                    onClick={onPromote}
                                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span>Promote to QA</span>
                                    <span>→</span>
                                </button>
                            ) : currentStage === 'QA' ? (
                                <button
                                    onClick={onPromote}
                                    className="px-8 py-4 bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span>Promote to STAGE</span>
                                    <span>→</span>
                                </button>
                            ) : currentStage === 'STAGE' && (
                                <button
                                    onClick={onPromote}
                                    className="px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                                >
                                    <span>INITIATE GOVERNANCE REVIEW</span>
                                    <span>→</span>
                                </button>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
