/**
 * Admin API Client Tests
 * 
 * Tests for admin API functions that follow MFE principles
 * by emitting events after mutations.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { updateTeam, updateProduct, getOrphanProducts } from './adminClient';
import { createEventBusSpy } from '../../../test-utils';
import { mockTeams, mockProducts, createMockTeam, createMockProduct } from '../../../test-utils/mockData';

describe('adminClient', () => {
    let eventBusSpy: ReturnType<typeof createEventBusSpy>;

    beforeEach(() => {
        eventBusSpy = createEventBusSpy();
        vi.clearAllMocks();
    });

    afterEach(() => {
        eventBusSpy.restore();
    });

    describe('updateTeam', () => {
        it('should update team and emit team:updated event', async () => {
            const teamId = 'team-1';
            const updates = { name: 'Updated Team Name' };

            const result = await updateTeam(teamId, updates);

            expect(result.id).toBe(teamId);
            expect(result.name).toBe('Updated Team Name');

            // Verify event was emitted
            expect(eventBusSpy.emissions).toHaveLength(1);
            expect(eventBusSpy.emissions[0]).toEqual({
                type: 'team:updated',
                payload: {
                    teamId,
                    team: expect.objectContaining({
                        id: teamId,
                        name: 'Updated Team Name',
                    }),
                },
            });
        });

        it('should merge updates with existing team properties', async () => {
            const teamId = 'team-platform';
            const updates = { memberCount: 15 };

            const result = await updateTeam(teamId, updates);

            expect(result.id).toBe(teamId);
            expect(result.memberCount).toBe(15);
        });
    });

    describe('updateProduct', () => {
        it('should update product and emit product:updated event', async () => {
            const productId = 'prod-1';
            const updates = { version: '2.0.0' };

            const result = await updateProduct(productId, updates);

            expect(result.id).toBe(productId);
            expect(result.version).toBe('2.0.0');

            // Verify event was emitted
            expect(eventBusSpy.emissions).toHaveLength(1);
            expect(eventBusSpy.emissions[0]).toEqual({
                type: 'product:updated',
                payload: {
                    productId,
                    product: expect.objectContaining({
                        id: productId,
                        version: '2.0.0',
                    }),
                },
            });
        });

        it('should update product ownership fields', async () => {
            const productId = 'prod-orphan';
            const updates = {
                ownerTeamId: 'team-platform',
                ownerAdGroupId: 'ad-group-platform',
            };

            const result = await updateProduct(productId, updates);

            expect(result.ownerTeamId).toBe('team-platform');
            expect(result.ownerAdGroupId).toBe('ad-group-platform');
        });
    });

    describe('getOrphanProducts', () => {
        it('should return empty array (TODO: implement)', async () => {
            const result = await getOrphanProducts();

            expect(Array.isArray(result)).toBe(true);
            expect(result).toHaveLength(0);
        });
    });

    describe('event emissions', () => {
        it('should emit events with correct payload structure', async () => {
            const teamId = 'team-test';
            const productId = 'prod-test';

            await updateTeam(teamId, { name: 'Test 1' });
            await updateProduct(productId, { version: '1.0.0' });

            expect(eventBusSpy.emissions).toHaveLength(2);

            // Team event
            const teamEvent = eventBusSpy.findEmission('team:updated');
            expect(teamEvent).toBeDefined();
            expect(teamEvent?.payload).toHaveProperty('teamId');
            expect(teamEvent?.payload).toHaveProperty('team');

            // Product event
            const productEvent = eventBusSpy.findEmission('product:updated');
            expect(productEvent).toBeDefined();
            expect(productEvent?.payload).toHaveProperty('productId');
            expect(productEvent?.payload).toHaveProperty('product');
        });
    });
});
