/**
 * @fileoverview Drafts Service
 * 
 * Manages draft files - temporary storage before approval/deployment
 */

import { query } from './db.js';
import { getBlobStorage } from './blobStorage.service.js';

export interface Draft {
    id: string;
    userId: string;
    blobUrl: string;
    fileName: string;
    fileType: 'contract' | 'policy' | 'config' | 'other';
    fileSizeBytes: number;
    mimeType: string;
    uploadedAt: Date;
    expiresAt: Date;
    status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'archived';
    approvalRequestId?: string;
    productId?: string;
    apiId?: string;
    contextNotes?: string;
}

/**
 * Create a new draft by uploading a file
 */
export async function createDraft(params: {
    userId: string;
    file: Buffer;
    fileName: string;
    fileType: 'contract' | 'policy' | 'config' | 'other';
    mimeType: string;
    productId?: string;
    apiId?: string;
    contextNotes?: string;
}): Promise<Draft> {
    const blobStorage = getBlobStorage();

    // Upload to blob storage
    const blobUrl = await blobStorage.upload(params.file, params.fileName, params.userId);
    const fileSizeBytes = params.file.length;

    // Create database record
    const result = await query(`
        INSERT INTO drafts (
            user_id, blob_url, file_name, file_type,
            file_size_bytes, mime_type,
            product_id, api_id, context_notes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
    `, [
        params.userId,
        blobUrl,
        params.fileName,
        params.fileType,
        fileSizeBytes,
        params.mimeType,
        params.productId || null,
        params.apiId || null,
        params.contextNotes || null
    ]);

    return mapDraft(result.rows[0]);
}

/**
 * Get a draft by ID
 */
export async function getDraft(draftId: string): Promise<Draft | null> {
    const result = await query(`
        SELECT * FROM drafts WHERE id = $1
    `, [draftId]);

    if (result.rows.length === 0) {
        return null;
    }

    return mapDraft(result.rows[0]);
}

/**
 * Get all drafts for a user
 */
export async function getUserDrafts(userId: string): Promise<Draft[]> {
    const result = await query(`
        SELECT * FROM drafts
        WHERE user_id = $1
        AND status != 'archived'
        ORDER BY uploaded_at DESC
    `, [userId]);

    return result.rows.map(mapDraft);
}

/**
 * Download draft file content
 */
export async function downloadDraft(draftId: string): Promise<{ draft: Draft; buffer: Buffer }> {
    const draft = await getDraft(draftId);

    if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
    }

    const blobStorage = getBlobStorage();
    const buffer = await blobStorage.download(draft.blobUrl);

    // Log access
    await query(`
        INSERT INTO blob_history (blob_url, action, user_id, draft_id, notes)
        VALUES ($1, 'downloaded', $2, $3, 'Draft downloaded')
    `, [draft.blobUrl, draft.userId, draftId]);

    return { draft, buffer };
}

/**
 * Delete a draft
 */
export async function deleteDraft(draftId: string, userId: string): Promise<void> {
    const draft = await getDraft(draftId);

    if (!draft) {
        throw new Error(`Draft not found: ${draftId}`);
    }

    // Verify ownership
    if (draft.userId !== userId) {
        throw new Error('Unauthorized: You can only delete your own drafts');
    }

    const blobStorage = getBlobStorage();

    // Delete from blob storage
    await blobStorage.delete(draft.blobUrl);

    // Log deletion
    await query(`
        INSERT INTO blob_history (blob_url, action, user_id, draft_id, notes)
        VALUES ($1, 'deleted', $2, $3, 'Draft manually deleted by user')
    `, [draft.blobUrl, userId, draftId]);

    // Archive in database (don't hard delete for audit)
    await query(`
        UPDATE drafts SET status = 'archived', updated_at = NOW()
        WHERE id = $1
    `, [draftId]);
}

/**
 * Get expired drafts for cleanup
 */
export async function getExpiredDrafts(): Promise<Draft[]> {
    const result = await query(`
        SELECT * FROM expired_drafts
    `);

    return result.rows.map(mapDraft);
}

/**
 * Cleanup expired drafts (called by scheduled job)
 */
export async function cleanupExpiredDrafts(): Promise<number> {
    const expiredDrafts = await getExpiredDrafts();

    console.log(`[Drafts Cleanup] Found ${expiredDrafts.length} expired drafts`);

    const blobStorage = getBlobStorage();
    let deletedCount = 0;

    for (const draft of expiredDrafts) {
        try {
            // Delete from blob storage
            await blobStorage.delete(draft.blobUrl);

            // Log expiration
            await query(`
                INSERT INTO blob_history (blob_url, action, user_id, draft_id, notes)
                VALUES ($1, 'expired', NULL, $2, 'Auto-deleted after 7-day TTL')
            `, [draft.blobUrl, draft.id]);

            // Archive in database
            await query(`
                UPDATE drafts SET status = 'archived', updated_at = NOW()
                WHERE id = $1
            `, [draft.id]);

            deletedCount++;
        } catch (error) {
            console.error(`[Drafts Cleanup] Failed to delete draft ${draft.id}:`, error);
        }
    }

    console.log(`[Drafts Cleanup] Deleted ${deletedCount} of ${expiredDrafts.length} drafts`);

    return deletedCount;
}

/**
 * Update draft status (e.g., when linked to approval)
 */
export async function updateDraftStatus(
    draftId: string,
    status: Draft['status'],
    approvalRequestId?: string
): Promise<void> {
    await query(`
        UPDATE drafts
        SET status = $1,
            approval_request_id = $2,
            updated_at = NOW()
        WHERE id = $3
    `, [status, approvalRequestId || null, draftId]);
}

/**
 * Map database row to Draft interface
 */
function mapDraft(row: any): Draft {
    return {
        id: row.id,
        userId: row.user_id,
        blobUrl: row.blob_url,
        fileName: row.file_name,
        fileType: row.file_type,
        fileSizeBytes: row.file_size_bytes,
        mimeType: row.mime_type,
        uploadedAt: new Date(row.uploaded_at),
        expiresAt: new Date(row.expires_at),
        status: row.status,
        approvalRequestId: row.approval_request_id,
        productId: row.product_id,
        apiId: row.api_id,
        contextNotes: row.context_notes
    };
}
