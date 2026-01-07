import { useState, useEffect, useMemo } from 'react';
import { type Product } from '../../../../shared/types/domain';
import { useAppData } from '../../../../shared/context/AppDataContext';
// import { useAuth } from '../../../../features/auth';
import { useStore } from '../../../../store/useStore';
import { inventoryApi } from '../../../inventory/api/inventoryClient';

interface RequestAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    product: Product;
    onSuccess?: () => void;
}

export const RequestAccessModal = ({
    isOpen,
    onClose,
    product,
    onSuccess
}: RequestAccessModalProps) => {
    const { teams } = useAppData();
    // const { user } = useAuth();
    const { addNotification } = useStore();

    const [selectedTeamId, setSelectedTeamId] = useState<string>('');
    const [justification, setJustification] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [termsAccepted, setTermsAccepted] = useState(false);

    // Auto-populate team if user is in only one
    useEffect(() => {
        if (isOpen && teams.length === 1) {
            setSelectedTeamId(teams[0].id);
        }
    }, [isOpen, teams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedTeamId) {
            alert('Please select a team.');
            return;
        }

        if (!termsAccepted) {
            alert('Please acknowledge the liability note.');
            return;
        }

        setIsSubmitting(true);
        try {
            await inventoryApi.requestAccess(product.id, selectedTeamId, justification);

            addNotification({
                type: 'success',
                title: 'Access Request Submitted',
                message: `Your request for ${product.displayName} is pending approval from the product owner.`,
            });

            if (onSuccess) onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Subscription failed:', error);
            addNotification({
                type: 'error',
                title: 'Submission Failed',
                message: error.message || 'Could not submit access request.'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const selectedTeamName = useMemo(() =>
        teams.find(t => t.id === selectedTeamId)?.name || 'Unknown Team',
        [teams, selectedTeamId]
    );

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-scale-up border border-gray-100 dark:border-slate-700">

                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8">
                    <h2 className="text-2xl font-black text-white tracking-tight mb-2">
                        Get Access to {product.displayName}
                    </h2>
                    <p className="text-blue-100 text-sm font-medium">
                        Subscribe your team to consume these API capabilities.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="p-8">

                    {/* "LOUD NOTE" Warning Banner */}
                    <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-6 rounded-r-xl mb-8 flex gap-4">
                        <span className="text-3xl">⚠️</span>
                        <div>
                            <h3 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-widest mb-1">
                                Critical Verification Required
                            </h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed font-bold">
                                You are about to subscribe <span className="underline decoration-2 decoration-amber-500/50">{selectedTeamId ? selectedTeamName : 'your team'}</span> to this API.
                                <br />
                                <span className="opacity-80 font-normal">Please verify this is the correct consumer identity. Use of the wrong team ID may result in billing to the wrong cost center.</span>
                            </p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Team Selection */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Subscriber Team identity
                            </label>
                            {teams.length > 1 ? (
                                <div className="relative">
                                    <select
                                        value={selectedTeamId}
                                        onChange={(e) => setSelectedTeamId(e.target.value)}
                                        className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 font-bold text-gray-900 dark:text-white focus:border-blue-500 focus:ring-0 outline-none appearance-none transition-all"
                                        required
                                    >
                                        <option value="" disabled>Select the team that owns this integration...</option>
                                        {teams.map(team => (
                                            <option key={team.id} value={team.id}>
                                                {team.name} ({team.id})
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400 text-xs">▼</div>
                                </div>
                            ) : (
                                <div className="bg-gray-100 dark:bg-slate-700/50 px-4 py-3 rounded-xl border-2 border-transparent flex items-center justify-between">
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        {teams[0]?.name}
                                    </span>
                                    <span className="text-xs font-mono text-gray-500">{teams[0]?.id}</span>
                                </div>
                            )}
                        </div>

                        {/* Justification */}
                        <div>
                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">
                                Business Justification
                            </label>
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="Describe your use case..."
                                className="w-full bg-gray-50 dark:bg-slate-900 border-2 border-gray-200 dark:border-slate-700 rounded-xl px-4 py-3 text-sm min-h-[100px] focus:border-blue-500 outline-none transition-all"
                                required
                            />
                        </div>

                        {/* Terms Checkbox */}
                        <div className="flex items-start gap-3 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-xl">
                            <input
                                type="checkbox"
                                id="terms"
                                checked={termsAccepted}
                                onChange={(e) => setTermsAccepted(e.target.checked)}
                                className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                            />
                            <label htmlFor="terms" className="text-xs text-blue-800 dark:text-blue-300 cursor-pointer select-none">
                                I confirm that I am authorized to act on behalf of the selected team and accept the consumption terms found in the API contract.
                            </label>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-gray-100 dark:border-slate-700">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-3 font-bold text-gray-600 hover:bg-gray-100 dark:text-slate-400 dark:hover:bg-slate-700 rounded-xl transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting || !selectedTeamId}
                            className={`px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs rounded-xl shadow-lg shadow-blue-500/30 transition-all flex items-center gap-2 ${(isSubmitting || !selectedTeamId) ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'
                                }`}
                        >
                            {isSubmitting ? <span className="animate-spin">⏳</span> : <span>🚀</span>}
                            {isSubmitting ? 'Submitting...' : 'Request Access'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
