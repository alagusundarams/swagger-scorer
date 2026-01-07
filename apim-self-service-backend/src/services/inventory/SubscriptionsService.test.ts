import { describe, it, expect, vi } from 'vitest';
import * as subscriptionsService from './SubscriptionsService.js';
import { query } from '../core/db.js';

vi.mock('../core/db.js', () => ({
    query: vi.fn()
}));

describe('Subscriptions Service', () => {
    it('should return all subscriptions with mapping', async () => {
        const mockRows = [{
            id: 'sub-1',
            product_id: 'prod-1',
            subscriber_team_id: 'team-1',
            state: 'active',
            app_id: 'app-1',
            app_display_name: 'App One',
            primary_key_value: 'key1',
            secondary_key_value: 'key2',
            team_name: 'Team One',
            product_name: 'Prod One'
        }];

        (query as any).mockResolvedValueOnce({ rows: mockRows });

        const results = await subscriptionsService.getAllSubscriptions();

        expect(results).toHaveLength(1);
        expect(results[0].id).toBe('sub-1');
        expect(results[0].product_name).toBe('Prod One');
        expect(results[0].primaryKey.value).toBe('key1');
    });

    it('should add a new subscription', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] }); // Approval insert
        (query as any).mockResolvedValueOnce({ rows: [{ id: 'new-id', product_id: 'p1', subscriber_team_id: 't1' }] }); // Sub insert

        const result = await subscriptionsService.addSubscription('p1', 't1', { name: 'User', email: 'user@example.com' });
        expect(result.id).toBe('new-id');
    });

    it('should update subscription state', async () => {
        (query as any).mockResolvedValueOnce({ rows: [] });
        await subscriptionsService.updateSubscriptionState('sub-1', 'active');
        expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE subscriptions'), ['active', 'sub-1']);
    });
});
