/**
 * Admin API Client Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { updateTeam, updateProduct } from './adminClient';

describe('Admin API Client', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should update team', async () => {
        const result = await updateTeam('team-1', { name: 'Updated Team' });
        expect(result).toBeTruthy();
    });

    it('should update product', async () => {
        const result = await updateProduct('prod-1', { displayName: 'Updated Product' });
        expect(result).toBeTruthy();
    });
});
