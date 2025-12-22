import { useState } from 'react';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (justification: string) => void;
    isDeploying: boolean;
    resourceName: string;
}

export const DeploymentConfirmationModal = ({ isOpen, onClose, onConfirm, isDeploying, resourceName }: Props) => {
    const [justification, setJustification] = useState('');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-center justify-center p-6 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 dark:border-slate-700 animate-in zoom-in-95 duration-300">
                <div className="p-8">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-3xl mb-6">
                        🚀
                    </div>

                    <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">
                        Deploy to GitOps
                    </h3>
                    <p className="text-gray-500 dark:text-slate-400 text-sm mb-6">
                        You are about to commit changes for <strong className="text-gray-900 dark:text-white">{resourceName}</strong>. This will trigger a deployment workflow in the <span className="text-blue-600 font-bold uppercase tracking-tighter">DEV</span> environment.
                    </p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                Justification / Reason for Change
                            </label>
                            <textarea
                                value={justification}
                                onChange={(e) => setJustification(e.target.value)}
                                placeholder="E.g., Added CORS origin for Payment portal..."
                                className="w-full h-32 p-4 bg-slate-50 dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-700 rounded-2xl text-sm outline-none focus:border-blue-500 transition-all resize-none dark:text-white"
                                disabled={isDeploying}
                            />
                        </div>

                        <div className="p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 rounded-2xl flex gap-3 text-xs text-orange-700 dark:text-orange-400">
                            <span className="text-lg">⚠️</span>
                            <p>This action creates a permanent record in the Git history and cannot be undone via this UI.</p>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50 dark:bg-slate-800/50 flex justify-end gap-3 border-t border-gray-100 dark:border-slate-800">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 text-gray-500 font-bold hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition"
                        disabled={isDeploying}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={() => onConfirm(justification)}
                        disabled={!justification.trim() || isDeploying}
                        className={`px-8 py-3 rounded-xl font-black text-sm uppercase tracking-wider transition-all shadow-lg ${!justification.trim() || isDeploying
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20 hover:scale-[1.02] active:scale-[0.98]'
                            }`}
                    >
                        {isDeploying ? (
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                Deploying...
                            </div>
                        ) : (
                            'Confirm Deployment'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};
