import React, { useState, useEffect, useCallback } from 'react';
import { MonacoEditor } from './MonacoEditor';
import { saveDraftFile, getDraftFile, clearDraftSession, getStorageUsageMB } from '../storage/draftStorage';
import type { API, Product } from '../../../types/entities';

interface ContractEditorModalProps {
    product: Product;
    api: API;
    isOpen: boolean;
    onClose: () => void;
    onCommit?: (message: string, description: string) => Promise<void>;
    readOnly?: boolean;
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
import { ContractEditorHeader } from './ContractEditorHeader';
import { GitContextPanel } from './GitContextPanel';
import { ContractCommitForm } from './ContractCommitForm';

export const ContractEditorModal: React.FC<ContractEditorModalProps> = ({
    product,
    api,
    isOpen,
    onClose,
    onCommit,
    readOnly = false
}) => {
    const [content, setContent] = useState('');
    const [commitMessage, setCommitMessage] = useState('');
    const [commitDescription, setCommitDescription] = useState('');
    const [isModified, setIsModified] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [storageUsage, setStorageUsage] = useState(0);

    const filename = 'contract.yaml';
    const language = 'yaml';

    useEffect(() => {
        if (!isOpen) return;

        const draft = getDraftFile(product.id, filename);
        if (draft) {
            setContent(draft.content);
            setIsModified(true);
        } else {
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
        }, 30000);

        return () => clearInterval(autoSaveInterval);
    }, [isOpen, isModified, content, product.id, filename, language]);

    const handleContentChange = useCallback((value: string | undefined) => {
        if (value !== undefined) {
            setContent(value);
            setIsModified(true);
        }
    }, []);

    const handleCommit = async () => {
        if (!commitMessage.trim()) {
            alert('Please provide a commit message');
            return;
        }

        setIsSaving(true);
        try {
            saveDraftFile(product.id, filename, content, language);
            if (onCommit) {
                await onCommit(commitMessage, commitDescription);
            }
            clearDraftSession(product.id);
            onClose();
        } catch (error) {
            console.error('Failed to commit:', error);
            alert('Failed to create pull request. Please try again.');
        } finally {
            setIsSaving(false);
        }
    };

    const handleClose = () => {
        if (isModified) {
            const confirmClose = window.confirm(
                'You have unsaved changes. Changes are auto-saved to your browser. Close anyway?'
            );
            if (!confirmClose) return;
        }
        onClose();
    };

    useEffect(() => {
        return () => {
            setIsModified(false);
        };
    }, []);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-full h-full max-w-[95vw] max-h-[95vh] bg-white dark:bg-slate-900 rounded-3xl shadow-2xl flex flex-col">
                <ContractEditorHeader
                    api={api}
                    product={product}
                    isModified={isModified}
                    content={content}
                    onClose={handleClose}
                />

                <GitContextPanel
                    product={product}
                    api={api}
                    filename={filename}
                    isModified={isModified}
                />

                <div className="flex-1 min-h-0 bg-[#1e1e1e] relative">
                    <MonacoEditor
                        value={content}
                        language={language}
                        onChange={handleContentChange}
                        readOnly={readOnly}
                        height="100%"
                    />
                </div>

                {!readOnly ? (
                    <ContractCommitForm
                        product={product}
                        commitMessage={commitMessage}
                        setCommitMessage={setCommitMessage}
                        commitDescription={commitDescription}
                        setCommitDescription={setCommitDescription}
                        storageUsage={storageUsage}
                        isSaving={isSaving}
                        onCancel={handleClose}
                        onCommit={handleCommit}
                    />
                ) : (
                    <div className="p-6 border-t border-gray-100 dark:border-slate-800 bg-gray-50 dark:bg-slate-800 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <span className="text-2xl">🔒</span>
                            <div>
                                <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Read-Only Mode</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                    This contract is managed by {product.managementMode === 'HYBRID' ? 'Terraform (Hybrid)' : 'Terraform'}.
                                    Edits must be made via the IaC pipeline.
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="px-6 py-3 bg-white dark:bg-slate-700 border border-gray-200 dark:border-slate-600 rounded-xl text-sm font-bold text-gray-700 dark:text-white hover:bg-gray-50 dark:hover:bg-slate-600 transition"
                        >
                            Close Viewer
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};


