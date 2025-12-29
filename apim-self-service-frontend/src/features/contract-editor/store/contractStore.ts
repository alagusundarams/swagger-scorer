import { create } from 'zustand';
import { saveDraftFile, getDraftFile, clearDraftSession, getStorageUsageMB } from '../storage/draftStorage';

interface ContractState {
    // Current editor state
    content: string;
    isModified: boolean;
    storageUsage: number;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadDraft: (productId: string, filename: string, defaultContent: string) => void;
    saveChanges: (productId: string, filename: string, language: 'yaml' | 'json' | 'xml') => boolean;
    updateContent: (content: string) => void;
    clearSession: (productId: string) => void;
}

/**
 * Feature Store: Contract Editor
 * 
 * Manages the state of the monaco editor and its persistence via draftStorage.
 * Follows MFE architecture by keeping contract state local to the feature.
 */
export const useContractStore = create<ContractState>((set, get) => ({
    content: '',
    isModified: false,
    storageUsage: 0,
    isLoading: false,
    error: null,

    loadDraft: (productId, filename, defaultContent) => {
        set({ isLoading: true, error: null });
        try {
            const draft = getDraftFile(productId, filename);
            if (draft) {
                set({ content: draft.content, isModified: true, isLoading: false });
            } else {
                set({ content: defaultContent, isModified: false, isLoading: false });
            }
            set({ storageUsage: getStorageUsageMB(productId) });
        } catch (err) {
            set({ error: 'Failed to load draft', isLoading: false });
        }
    },

    saveChanges: (productId, filename, language) => {
        const { content } = get();
        const success = saveDraftFile(productId, filename, content, language);
        if (success) {
            set({ isModified: false, storageUsage: getStorageUsageMB(productId) });
        }
        return success;
    },

    updateContent: (content) => {
        set({ content, isModified: true });
    },

    clearSession: (productId) => {
        clearDraftSession(productId);
        set({ content: '', isModified: false, storageUsage: 0 });
    }
}));
