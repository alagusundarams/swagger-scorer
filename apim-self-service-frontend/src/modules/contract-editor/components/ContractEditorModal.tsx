import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { MonacoEditor } from './MonacoEditor';
import { saveDraftFile, getDraftFile, clearDraftSession, getStorageUsageMB } from '../storage/draftStorage';
import type { API, Product } from '../../../types/entities';

interface ContractEditorModalProps {
    product: Product;
    api: API;
    isOpen: boolean;
    onClose: () => void;
    onCommit?: (message: string, description: string) => Promise<void>;
}

/**
 * Contract Editor Modal - Full-screen YAML/JSON editor
 * 
 * Features:
 * - Monaco editor for contract editing
 * - Auto-save to localStorage every 30 seconds
 * - Real-time validation (TODO: integrate with analyzer)
 * - Git commit form
 * - Memory-efficient (disposes on close)
 */
export const ContractEditorModal: React.FC<ContractEditorModalProps> = ({
    product,
    api,
    isOpen,
    onClose,
    onCommit
}) => {
    const navigate = useNavigate();
    const [content, setContent] = useState('');
    const [commitMessage, setCommitMessage] = useState('');
    const [commitDescription, setCommitDescription] = useState('');
    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [storageUsage, setStorageUsage] = useState(0);

    const filename = 'contract.yaml';
    const language = 'yaml';

    // Load contract from localStorage or mock data
    useEffect(() => {
        if (!isOpen) return;

        const draft = getDraftFile(product.id, filename);
        if (draft) {
            setContent(draft.content);
            setIsModified(true);
        } else {
            // TODO: Load from Git API
            // For now, use mock contract
            const mockContract = `openapi: 3.0.0
info:
  title: ${api.displayName}
  description: ${api.description}
  version: 1.0.0

paths:
${api.operations.map(op => `  ${op.urlTemplate}:
    ${op.method.toLowerCase()}:
      summary: ${op.displayName}
      description: ${op.description}
      responses:
        '200':
          description: Successful response`).join('\n')}
`;
            setContent(mockContract);
        }

        setStorageUsage(getStorageUsageMB(product.id));
    }, [isOpen, product.id, api, filename]);

    // Auto-save to localStorage every 30 seconds
    useEffect(() => {
        if (!isOpen || !isModified) return;

        const autoSaveInterval = setInterval(() => {
            const saved = saveDraftFile(product.id, filename, content, language);
            if (saved) {
                console.log('[Auto-save] Draft saved to localStorage');
                setStorageUsage(getStorageUsageMB(product.id));
            } else {
                console.warn('[Auto-save] Failed - storage limit exceeded');
            }
        }, 30000); // 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [isOpen, isModified, content, product.id, filename, language]);

    // Handle content change
    const handleContentChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            setContent(value);
            setIsModified(true);
        }
    }, []);

    // Handle commit
    const handleCommit = async () => {
        if (!commitMessage.trim()) {
            alert('Please provide a commit message');
            return;
        }

        setIsSaving(true);
        try {
            // Save final version to localStorage
            saveDraftFile(product.id, filename, content, language);

            // Call onCommit callback (will create PR)
            if (onCommit) {
                await onCommit(commitMessage, commitDescription);
            }

            // Clear draft from localStorage after successful commit
            clearDraftSession(product.id);

            // Close modal
            onClose();
        } catch (error) {
            console.error('Failed to commit:', error);
            alert('Failed to create pull request. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle close (with unsaved changes warning)
    const handleClose = () => {
        if (isModified) {
            const confirmClose = window.confirm(
                'You have unsaved changes. Changes are auto-saved to your browser. Close anyway?'
            );
            if (!confirmClose) return;
        }
        onClose();
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            // Clear interval on unmount
            setIsModified(false);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-8 py-6 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-center gap-4">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white">
                            ⚙️ Edit Contract: {api.displayName}
                        </h2>
                        <span className={`px-3 py-1 text-xs font-black rounded-lg ${product.environment === 'PROD'
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-blue-500/10 text-blue-500'
                            }`}>
                            {product.environment}
                        </span>
                        {isModified && (
                            <span className="px-3 py-1 text-xs font-black rounded-lg bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400">
                                ● Modified
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Analyze Button */}
                        <button
                            onClick={() => {
                                // Navigate to analyzer (preserves auth)
                                navigate(`/analyzer?apiId=${api.id}`);
                            }}
                            className="px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm font-black rounded-xl transition flex items-center gap-2"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                            </svg>
                            Analyze
                        </button>
                        <button
                            onClick={handleClose}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-2xl font-bold"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Git Context Panel */}
                <div className="px-8 py-4 bg-gray-50 dark:bg-slate-800/50 border-b border-gray-200 dark:border-slate-700">
                    <div className="flex items-start gap-6 text-sm">
                        {/* Repo & Branch */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-slate-500">📂</span>
                            <span className="font-semibold text-gray-700 dark:text-gray-300">
                                {product.name}-product
                            </span>
                        </div>

                        {/* Branch */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-slate-500">🌿</span>
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                portal/{api.name}-{new Date().toISOString().split('T')[0]}
                            </span>
                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold rounded">
                                NEW
                            </span>
                        </div>

                        {/* File Path */}
                        <div className="flex items-center gap-2">
                            <span className="text-gray-400 dark:text-slate-500">📄</span>
                            <span className="font-mono text-xs text-gray-600 dark:text-gray-400">
                                apis/{api.name}/{filename}
                            </span>
                        </div>

                        {/* Draft Indicator */}
                        {isModified && (
                            <div className="flex items-center gap-2 ml-auto">
                                <span className="text-gray-400 dark:text-slate-500">💾</span>
                                <span className="text-xs text-gray-500 dark:text-slate-400">
                                    Draft in browser (auto-saved)
                                </span>
                            </div>
                        )}
                    </div>

                    {/* TODO: Show last commit info when loading from Git */}
                    {/* <div className="text-xs text-gray-500 mt-2">
                        👤 Last edit: john.doe • 2 hours ago
                    </div> */}
                </div>


                {/* Editor Area */}
                <div className="flex-1 overflow-hidden p-6">
                    <MonacoEditor
                        value={content}
                        language={language}
                        onChange={handleContentChange}
                        readOnly={false}
                        height="100%"
                    />
                </div>

                {/* Footer - Git Commit (ALL PRODUCTS) */}
                <div className="border-t border-gray-200 dark:border-slate-700 p-6 space-y-4">
                    {/* Deployment choice banner for Terraform products */}
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
                                    onClick={() => {
                                        // TODO: Show migration wizard modal
                                        alert('Migration wizard coming soon! For now, commit will use Terraform pipeline.');
                                    }}
                                    className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-black rounded-lg transition-colors"
                                >
                                    Switch to Portal Deployment →
                                </button>
                                <p className="text-[10px] text-blue-500 dark:text-blue-400 mt-2">
                                    Or continue with Terraform - your choice!
                                </p>
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
                            onClick={handleClose}
                            className="px-6 py-3 text-sm font-black text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white uppercase tracking-wider rounded-xl transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCommit}
                            disabled={isSaving || !commitMessage.trim()}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-black text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all disabled:cursor-not-allowed"
                        >
                            {isSaving ? 'Creating PR...' : 'Commit to Git'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
