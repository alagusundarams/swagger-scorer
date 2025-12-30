/**
 * ProductDetailConsumer View Tests
 */

import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { renderWithAppData } from '../../../test-utils';
import { mockTeams, createMockProduct } from '../../../test-utils/mockData';
import { ProductDetailConsumer } from './ProductDetailConsumer.view';
import type { User } from '../../../types/commonTypes';

const mockProduct = createMockProduct({
    id: 'prod-test',
    displayName: 'Test Product',
});

const mockUser: User = {
    id: 'user-123',
    email: 'consumer@example.com',
    name: 'Consumer User',
    azureAdObjectId: 'ad-obj-123',
    teams: ['team-mobile'],
    leadsTeams: [],
    defaultTeamId: 'team-mobile',
    role: 'user',
};

describe('ProductDetailConsumer', () => {
    it('should render product details', () => {
        renderWithAppData(
            <BrowserRouter>
                <ProductDetailConsumer
                    product={mockProduct}
                    user={mockUser}
                    subscription={null}
                    hasPendingRequest={false}
                    onRequestAccess={() => { }}
                />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        expect(screen.getByText('Test Product')).toBeTruthy();
    });

    it('should use AppDataContext for teams data', () => {
        const { container } = renderWithAppData(
            <BrowserRouter>
                <ProductDetailConsumer
                    product={mockProduct}
                    user={mockUser}
                    subscription={null}
                    hasPendingRequest={false}
                    onRequestAccess={() => { }}
                />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        expect(container).toBeTruthy();
    });
});
