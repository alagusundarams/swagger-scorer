/**
 * Named Values Service - Shared Resource Management
 */

import { productsRepo } from '../../repositories/products.repo.js';
import type { ProductsRepository } from '../../repositories/products.repo.js';

const repo: ProductsRepository = (productsRepo as any) || new (await import('../../repositories/products.repo.js')).ProductsRepository();

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

export async function referenceExistingNamedValue(productId: string, namedValueId: string) {
    const existing = await repo.getProductNamedValueLink(productId, namedValueId);
    if (existing.rows.length > 0) {
        throw new Error('Already linked to your product');
    }

    await repo.linkProductToNamedValue(productId, namedValueId, {
        isOwner: false,
        canModify: false
    });

    return { status: 'REFERENCED' };
}
