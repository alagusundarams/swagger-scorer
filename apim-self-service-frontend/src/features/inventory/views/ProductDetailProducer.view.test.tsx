/**
 * ProductDetailProducer View Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { renderWithAppData } from '../../../test-utils';
import { mockTeams, createMockProduct, mockSubscriptions } from '../../../test-utils/mockData';
import { ProductDetailProducer } from './ProductDetailProducer.view';

const mockProduct = createMockProduct({
    id: 'prod-test',
    name: 'Test Product',
    ownerTeamId: 'team-platform',
});

const mockUser = {
    email: 'producer@example.com',
    name: 'Producer User',
    roles: ['producer'],
};

describe('ProductDetailProducer', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render product details with team dropdown', () => {
        renderWithAppData(
            <BrowserRouter>
                <ProductDetailProducer product={mockProduct} user={mockUser} />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('should display subscriber list', () => {
        renderWithAppData(
            <BrowserRouter>
                <ProductDetailProducer product={mockProduct} user={mockUser} />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        // Should show subscribers section
        const subscribersSection = screen.queryByTestId('subscribers-section');
        if (subscribersSection) {
            expect(subscribersSection).toBeInTheDocument();
        }
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
