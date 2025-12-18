import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useStore } from './useStore';
import * as client from '../features/analyzer/api/client';
import { Product, Team, Subscription } from '../types/entities';

// Mock the API client
vi.mock('../features/analyzer/api/client', () => ({
    getProducts: vi.fn(),
    getTeams: vi.fn(),
    getSubscriptions: vi.fn(),
    requestProductAccess: vi.fn(),
    updateSubscription: vi.fn(),
}));

describe('useStore', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useStore.setState({
            user: null,
            products: [],
            teams: [],
            subscriptions: [],
            notifications: []
        });
    });

    it('sets user correctly', () => {
        const user = { id: 'u1', name: 'Test User', teams: [] } as any;
        useStore.getState().setUser(user);
        expect(useStore.getState().user).toEqual(user);
    });

    it('fetches initial data correctly', async () => {
        const mockProducts: Product[] = [{ id: 'p1', displayName: 'Product 1', ownerTeamId: 't1' } as any];
        const mockTeams: Team[] = [{ id: 't1', name: 'Team 1' } as any];

        (client.getProducts as any).mockResolvedValue({ data: mockProducts });
        (client.getTeams as any).mockResolvedValue({ data: mockTeams });

        await useStore.getState().fetchInitialData();

        expect(useStore.getState().products).toEqual(mockProducts);
        expect(useStore.getState().teams).toEqual(mockTeams);
    });

    it('fetches subscriptions if token is provided', async () => {
        const mockProducts: Product[] = [];
        const mockTeams: Team[] = [];
        const mockSubs: Subscription[] = [{ id: 's1', productId: 'p1' } as any];

        (client.getProducts as any).mockResolvedValue({ data: mockProducts });
        (client.getTeams as any).mockResolvedValue({ data: mockTeams });
        (client.getSubscriptions as any).mockResolvedValue({ data: mockSubs });

        const getToken = vi.fn().mockResolvedValue('fake-token');

        await useStore.getState().fetchInitialData(getToken);

        expect(useStore.getState().subscriptions).toEqual(mockSubs);
        expect(client.getSubscriptions).toHaveBeenCalledWith('fake-token');
    });

    it('adds a subscription successfully', async () => {
        const newSub = { id: 's2', productId: 'p2', state: 'pending' } as any;
        (client.requestProductAccess as any).mockResolvedValue({ data: newSub });

        const getToken = vi.fn().mockResolvedValue('fake-token');

        await useStore.getState().addSubscription('p2', 't1', getToken);

        expect(client.requestProductAccess).toHaveBeenCalledWith('p2', 't1', 'fake-token');
        expect(useStore.getState().subscriptions).toContainEqual(newSub);
    });

    it('updates subscription status successfully', async () => {
        // Setup initial state
        const initialSub = { id: 's1', state: 'pending' } as any;
        useStore.setState({ subscriptions: [initialSub] });

        (client.updateSubscription as any).mockResolvedValue({ data: { ...initialSub, state: 'active' } });
        const getToken = vi.fn().mockResolvedValue('fake-token');

        await useStore.getState().updateSubscription('s1', { state: 'active' }, getToken);

        expect(client.updateSubscription).toHaveBeenCalledWith('s1', 'active', 'fake-token');
        expect(useStore.getState().subscriptions[0].state).toBe('active');
    });
});
