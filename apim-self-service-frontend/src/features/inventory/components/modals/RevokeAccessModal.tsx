
interface RevokeAccessModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    revocationReason: string;
    setRevocationReason: (reason: string) => void;
    apiCount: number;
}

export function RevokeAccessModal({
    isOpen,
    onClose,
    onConfirm,
    revocationReason,
    setRevocationReason,
    apiCount
}: RevokeAccessModalProps) {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            role="dialog"
            aria-modal="true"
            aria-labelledby="revoke-modal-title"
        >
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md w-full mx-4 shadow-2xl">
                <h3 id="revoke-modal-title" className="text-xl font-bold text-gray-900 dark:text-white mb-4">
                    Revoke Access?
                </h3>
                <p className="text-gray-600 dark:text-slate-400 mb-6">
                    This will immediately disable API keys and remove access to all {apiCount} APIs in this product.
                    The team will be notified.
                </p>
                <div className="mb-6">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Reason for Revocation</label>
                    <textarea
                        value={revocationReason}
                        onChange={(e) => setRevocationReason(e.target.value)}
                        placeholder="e.g., Compliance breach, Project termination..."
                        className="w-full p-4 rounded-xl bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 text-sm focus:ring-2 focus:ring-red-500/20 outline-none h-24 resize-none"
                    />
                </div>
                <div className="flex gap-3 justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 transition font-bold text-xs"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={!revocationReason.trim()}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition font-bold text-xs disabled:opacity-50"
                    >
                        Revoke Access
                    </button>
                </div>
            </div>
        </div>
    );
}
