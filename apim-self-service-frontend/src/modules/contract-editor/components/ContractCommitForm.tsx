import React from 'react';
import type { Product } from '../../../types/entities';

interface ContractCommitFormProps {
    product: Product;
    commitMessage: string;
    setCommitMessage: (msg: string) => void;
    commitDescription: string;
    setCommitDescription: (desc: string) => void;
    storageUsage: number;
    isSaving: boolean;
    onCancel: () => void;
    onCommit: () => void;
}

export const ContractCommitForm: React.FC<ContractCommitFormProps> = ({
    product,
    commitMessage,
    setCommitMessage,
    commitDescription,
    setCommitDescription,
    storageUsage,
    isSaving,
    onCancel,
    onCommit
}) => {
    return (
        <div className="border-t border-gray-200 dark:border-slate-700 p-6 space-y-4">
            {product.management_mode === 'TERRAFORM_MANAGED' && (
                <div className="flex items-start gap-3 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 border border-blue-200 dark:border-blue-800 rounded-xl">
                    <span className="text-blue-500 text-lg">🚀</span>
                    <div className="flex-1">
                        <p className="font-black text-blue-900 dark:text-blue-100 text-sm">Choose Your Deployment Method</p>
                        <p className="text-blue-700 dark:text-blue-300 text-xs mt-1">
                            Currently using Terraform pipeline. Switch to Portal for:
                        </p>
                        <ul className="text-xs text-blue-600 dark:text-blue-400 mt-2 space-y-1 ml-4">
                            <li>✓ <strong>Faster deployments</strong> (no pipeline wait)</li>
                            <li>✓ <strong>Better audit trail</strong> (built-in golden records)</li>
                            <li>✓ <strong>No ServiceNow tickets</strong> (self-service)</li>
                        </ul>
                        <button
                            onClick={() => alert('Migration wizard coming soon!')}
                            className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-lg transition-colors"
                        >
                            Switch to Portal Deployment →
                        </button>
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                    Git Commit
                </h3>
                <span className="text-xs text-gray-400">
                    Storage: {storageUsage.toFixed(2)} MB / 2 MB
                </span>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <input
                    type="text"
                    placeholder="Commit message (required)"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                    type="text"
                    placeholder="Description (optional)"
                    value={commitDescription}
                    onChange={(e) => setCommitDescription(e.target.value)}
                    className="px-4 py-3 bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
            </div>

            <div className="flex justify-end gap-3">
                <button
                    onClick={onCancel}
                    className="px-6 py-3 text-sm font-black text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-wider rounded-xl"
                >
                    Cancel
                </button>
                <button
                    onClick={onCommit}
                    disabled={isSaving || !commitMessage.trim()}
                    className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all"
                >
                    {isSaving ? 'Creating PR...' : 'Commit to Git'}
                </button>
            </div>
        </div>
    );
};
