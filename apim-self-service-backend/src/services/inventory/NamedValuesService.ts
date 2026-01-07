/**
 * Named Values Service - Complete CRUD with Shared Resource Management
 * Migrated from ProductsService for proper separation of concerns
 */

import { ProductsRepository } from '../../repositories/products.repo.js';
import { logAudit } from '../core/AuditService.js';

const repo = new ProductsRepository();

// ============================================================================
// READ Operations
// ============================================================================

export async function getNamedValues(productId: string) {
    const res = await repo.getNamedValues(productId);

    return res.rows.map((row: any) => ({
        ...row,
        scopeName: row.scope_name,
        value: row.is_secret ? '*****' : row.value
    }));
}

// ============================================================================
// CREATE Operations with Duplicate Detection
// ============================================================================

export async function checkNamedValueDuplicate(systemName: string, environment: string) {
    const existing = await repo.findNamedValueByName(systemName, environment);

    if (!existing.rows || existing.rows.length === 0) {
        return { exists: false };
    }

    const nv = existing.rows[0];
    const owners = await repo.getNamedValueProducts(nv.id);

    return {
        exists: true,
        existing: {
            id: nv.id,
            displayName: nv.display_name,
            value: nv.is_secret ? '***HIDDEN***' : nv.value,
            owners: owners.rows.map((o: any) => ({
                productName: o.display_name,
                teamName: o.team_name,
                isOwner: o.is_owner
            }))
        }
    };
}

export async function createNamedValue(productId: string, data: {
    displayName: string,
    systemName: string,
    value: string,
    type: 'literal' | 'key_vault',
    isSecret: boolean,
    scopeId?: string,
    allowOverwrite?: boolean
}) {
    // 0. Fetch Product for environment context
    const productsRes = await repo.getProductById(productId);
    if (productsRes.rowCount === 0) throw new Error('Product not found.');
    const product = productsRes.rows[0];

    // 1. If scoped to API, verify API belongs to Product
    if (data.scopeId) {
        const apiCheck = await repo.checkApiBelongsToProduct(data.scopeId, productId);
        if (apiCheck.rowCount === 0) throw new Error('Invalid Scope: API does not belong to this Product.');
    }

    // 2. Value collision check (audit only, non-secret)
    if (!data.isSecret) {
        const collision = await repo.checkNamedValueCollision(data.value);
        if (collision.rowCount > 0) {
            await logAudit({
                entityType: 'NAMED_VALUE',
                entityId: 'potential-collision',
                action: 'VALUE_COLLISION_DETECTED',
                userId: 'system-user',
                changes: {
                    newSystemName: data.systemName,
                    existingMatch: `${collision.rows[0].product_id}/${collision.rows[0].system_name}`,
                    note: 'Identical value detected across different keys.'
                }
            });
        }
    }

    // 3. Check for duplicates within same product/scope
    const existing = await repo.getExistingNamedValue(productId, data.systemName, data.scopeId);

    const fullData = {
        ...data,
        environment: product.environment,
        region: product.region || 'Global'
    };

    if (existing.rowCount > 0) {
        if (!data.allowOverwrite) {
            throw new Error('DUPLICATE_CONFIRMATION_REQUIRED: Value exists. Confirm overwrite?');
        }

        // Overwrite (Update)
        const idToUpdate = existing.rows[0].id;
        const res = await repo.updateNamedValue(idToUpdate, fullData);

        await logAudit({
            entityType: 'NAMED_VALUE',
            entityId: idToUpdate,
            action: 'OVERWRITE_NAMED_VALUE',
            userId: 'system-user',
            changes: { productId, scopeId: data.scopeId, systemName: data.systemName }
        });

        return res.rows[0];
    }

    // 4. Create new named value
    const res = await repo.createNamedValue(productId, fullData);
    const nvId = res.rows[0].id;

    // 5. CRITICAL: Link to product via junction table
    await repo.linkProductToNamedValue(productId, nvId, {
        isOwner: true,
        canModify: true
    });

    await logAudit({
        entityType: 'NAMED_VALUE',
        entityId: nvId,
        action: 'CREATE_NAMED_VALUE',
        userId: 'system-user',
        changes: { productId, scopeId: data.scopeId, systemName: data.systemName }
    });

    return res.rows[0];
}

// ============================================================================
// REFERENCE Operations (Shared Resources)
// ============================================================================

export async function referenceExistingNamedValue(productId: string, namedValueId: string) {
    const existing = await repo.getProductNamedValueLink(productId, namedValueId);
    if (existing.rows.length > 0) {
        throw new Error('Already linked to your product');
    }

    await repo.linkProductToNamedValue(productId, namedValueId, {
        isOwner: false,
        canModify: false
    });

    await logAudit({
        entityType: 'NAMED_VALUE',
        entityId: namedValueId,
        action: 'REFERENCE_NAMED_VALUE',
        userId: 'system-user',
        changes: { productId, note: 'Read-only reference created' }
    });

    return { status: 'REFERENCED' };
}

// ============================================================================
// DELETE Operations with Junction Table Awareness
// ============================================================================

export async function deleteNamedValue(productId: string, valueId: string) {
    // 1. Check junction table links
    const allLinks = await repo.getNamedValueProducts(valueId);

    if (allLinks.rows.length > 1) {
        // Shared resource - just unlink
        await repo.unlinkProductFromNamedValue(productId, valueId);

        await logAudit({
            entityType: 'NAMED_VALUE',
            entityId: valueId,
            action: 'UNLINK_NAMED_VALUE',
            userId: 'system-user',
            changes: { productId, remainingLinks: allLinks.rows.length - 1 }
        });

        return {
            status: 'UNLINKED',
            message: `Named value removed from your product. Still used by ${allLinks.rows.length - 1} other product(s).`
        };
    }

    // 2. Last product - full delete
    const res = await repo.deleteNamedValue(productId, valueId);

    if (res.rowCount === 0) throw new Error('Named Value not found.');

    await logAudit({
        entityType: 'NAMED_VALUE',
        entityId: valueId,
        action: 'DELETE_NAMED_VALUE',
        userId: 'system-user',
        changes: { productId }
    });

    return {
        status: 'DELETED',
        message: 'Named value permanently deleted'
    };
}
