/**
 * LocalStorage Draft Manager
 * 
 * Manages temporary file storage in browser localStorage with:
 * - Auto-save functionality
 * - 2MB size limit per product
 * - Automatic cleanup
 * - Memory-efficient key management
 */

const DRAFT_PREFIX = 'draft-editor';
const MAX_STORAGE_MB = 2;
const MAX_STORAGE_BYTES = MAX_STORAGE_MB * 1024 * 1024;

export interface DraftFile {
    filename: string;
    content: string;
    language: 'yaml' | 'json' | 'xml';
    timestamp: number;
}

export interface DraftSession {
    productId: string;
    files: Record<string, DraftFile>;
    totalSize: number;
}

/**
 * Get draft key for a product
 */
const getDraftKey = (productId: string): string => {
    return `${DRAFT_PREFIX}-${productId}`;
};

/**
 * Calculate size of object in bytes
 */
const getObjectSize = (obj: any): number => {
    return new Blob([JSON.stringify(obj)]).size;
};

/**
 * Get draft session from localStorage
 */
export const getDraftSession = (productId: string): DraftSession | null => {
    try {
        const key = getDraftKey(productId);
        const data = localStorage.getItem(key);
        if (!data) return null;

        const session: DraftSession = JSON.parse(data);
        return session;
    } catch (error) {
        console.error('Failed to load draft session:', error);
        return null;
    }
};

/**
 * Save file to draft session
 * Returns true if successful, false if exceeded size limit
 */
export const saveDraftFile = (
    productId: string,
    filename: string,
    content: string,
    language: 'yaml' | 'json' | 'xml'
): boolean => {
    try {
        const key = getDraftKey(productId);
        const existingSession = getDraftSession(productId);

        const file: DraftFile = {
            filename,
            content,
            language,
            timestamp: Date.now()
        };

        const newSession: DraftSession = existingSession || {
            productId,
            files: {},
            totalSize: 0
        };

        newSession.files[filename] = file;
        newSession.totalSize = getObjectSize(newSession);

        // Check size limit
        if (newSession.totalSize > MAX_STORAGE_BYTES) {
            console.warn(`Draft session exceeds ${MAX_STORAGE_MB}MB limit`);
            return false;
        }

        localStorage.setItem(key, JSON.stringify(newSession));
        return true;
    } catch (error) {
        console.error('Failed to save draft file:', error);
        return false;
    }
};

/**
 * Get a specific file from draft session
 */
export const getDraftFile = (productId: string, filename: string): DraftFile | null => {
    const session = getDraftSession(productId);
    return session?.files[filename] || null;
};

/**
 * Delete draft session
 */
export const clearDraftSession = (productId: string): void => {
    try {
        const key = getDraftKey(productId);
        localStorage.removeItem(key);
    } catch (error) {
        console.error('Failed to clear draft session:', error);
    }
};

/**
 * Get all modified files in session
 */
export const getModifiedFiles = (productId: string): string[] => {
    const session = getDraftSession(productId);
    return session ? Object.keys(session.files) : [];
};

/**
 * Check if storage limit will be exceeded
 */
export const willExceedLimit = (productId: string, content: string): boolean => {
    const session = getDraftSession(productId);
    if (!session) return false;

    const testSize = session.totalSize + new Blob([content]).size;
    return testSize > MAX_STORAGE_BYTES;
};

/**
 * Get current storage usage in MB
 */
export const getStorageUsageMB = (productId: string): number => {
    const session = getDraftSession(productId);
    return session ? session.totalSize / (1024 * 1024) : 0;
};
