/**
 * Admin Client - Delete Operations
 * 
 * Frontend API client for admin delete functionality
 */

import { baseClient } from '../../../shared/api/baseClient';

export type ResourceType = 'product' | 'subscription' | 'named_value' | 'backend';

/**
 * Delete a single orphaned resource
 */
export const deleteOrphan = async (
    resourceType: ResourceType,
    id: string,
    reason: string
): Promise<{ success: boolean; auditLogId: string }> => {
    const pluralType = `${resourceType}s`;
    const res = await baseClient.delete(`/admin/${pluralType}/${id}`, {
        data: { reason }
    });
    return res.data;
};

/**
 * Bulk delete multiple orphaned resources
 */
export const bulkDeleteOrphans = async (
    resourceType: ResourceType,
    ids: string[],
    reason: string
): Promise<{ deleted: number; failed: number; failures: Array<{ id: string; error: string }>; auditLogId: string }> => {
    const pluralType = `${resourceType}s`;
    const idsKey = `${resourceType}Ids`;

    const res = await baseClient.post(`/admin/${pluralType}/bulk-delete`, {
        [idsKey]: ids,
        reason
    });
    return res.data;
};
