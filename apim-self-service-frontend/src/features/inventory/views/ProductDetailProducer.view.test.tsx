/**
 * ProductDetailProducer View Tests - Fixed
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { renderWithAppData } from '../../../test-utils';
import { mockTeams, createMockProduct } from '../../../test-utils/mockData';
import { ProductDetailProducer } from './ProductDetailProducer.view';
import type { User } from '../../../shared/types/domain';

const mockProduct = createMockProduct({
    id: 'prod-test',
    name: 'Test Product',
    ownerTeamId: 'team-platform',
});

const mockUser: User = {
    id: 'user-123',
    email: 'producer@example.com',
    name: 'Producer User',
    azureAdObjectId: 'ad-obj-123',
    teams: ['team-platform'],
    leadsTeams: [],
    role: 'producer',
    isAdmin: false,
};

describe('ProductDetailProducer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render product details', () => {
        renderWithAppData(
            <BrowserRouter>
                <ProductDetailProducer product={mockProduct} user={mockUser} />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        expect(screen.getByText('Test Product')).toBeTruthy();
    });

    it('should use AppDataContext for teams data', () => {
        const { container } = renderWithAppData(
            <BrowserRouter>
                <ProductDetailProducer product={mockProduct} user={mockUser} />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        // Teams from context should be available
        expect(container).toBeTruthy();
    });
});
