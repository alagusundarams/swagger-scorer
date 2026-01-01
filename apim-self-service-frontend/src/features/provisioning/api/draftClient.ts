/**
 * Draft Management API Client
 * 
 * Manages onboarding drafts stored in Blob Storage.
 * This ensures data persistence across sessions during the onboarding process
 * until the product is officially approved and committed to Git.
 */

/**
 * ------------------------------------------------------------------
 * 📍 API Client: Onboarding Drafts (Blob Persistence)
 * ------------------------------------------------------------------
 * 🔄 RESPONSIBILITY:
 * - Manages the persistent lifecycle of multi-step onboarding drafts.
 * - Bridges the frontend wizard state with backend Blob Storage.
 * - Ensures recovery of in-flight API sketches across sessions.
 * ------------------------------------------------------------------
 */
import { api } from '../../../api/baseClient';

export interface OnboardingDraft {
    id: string; // draftId or projectName
    step: number;
    formData: any;
    lastUpdated: number;
}

/**
 * Save current onboarding state as a draft in Blob Storage
 */
export async function saveDraft(draftId: string, step: number, formData: any): Promise<void> {
    try {
        await api.post('/provisioning/drafts', {
            id: draftId,
            step,
            formData,
            lastUpdated: Date.now()
        });
    } catch (error) {
        console.error('Failed to save onboarding draft to blob storage:', error);
        throw error;
    }
}

/**
 * Load onboarding draft from Blob Storage
 */
export async function loadDraft(draftId: string): Promise<OnboardingDraft | null> {
    try {
        const res = await api.get(`/provisioning/drafts/${encodeURIComponent(draftId)}`);
        return res.data;
    } catch (error) {
        console.error('Failed to load onboarding draft:', error);
        return null; // Return null if not found
    }
}

/**
 * Delete draft once approved/finished
 */
export async function deleteDraft(draftId: string): Promise<void> {
    try {
        await api.delete(`/provisioning/drafts/${encodeURIComponent(draftId)}`);
    } catch (error) {
        console.error('Failed to delete onboarding draft:', error);
    }
}
