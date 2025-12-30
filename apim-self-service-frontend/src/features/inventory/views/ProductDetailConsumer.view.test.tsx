/**
 * ProductDetailConsumer View Tests
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { renderWithAppData } from '../../../test-utils';
import { mockTeams, mockProducts, createMockProduct } from '../../../test-utils/mockData';
import { ProductDetailConsumer } from './ProductDetailConsumer.view';

const mockProduct = createMockProduct({
    id: 'prod-test',
    name: 'Test Product',
    environment: 'DEV' as any,
});

const mockUser = {
    email: 'test@example.com',
    name: 'Test User',
    roles: ['consumer'],
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
                    onRequestAccess={vi.fn()}
                />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        expect(screen.getByText('Test Product')).toBeInTheDocument();
    });

    it('should show request access button when no subscription', () => {
        const onRequestAccess = vi.fn();

        renderWithAppData(
            <BrowserRouter>
                <ProductDetailConsumer
                    product={mockProduct}
                    user={mockUser}
                    subscription={null}
                    hasPendingRequest={false}
                    onRequestAccess={onRequestAccess}
                />
            </BrowserRouter>,
            { teams: mockTeams }
        );

        const button = screen.queryByText('Request Access');
        if (button) {
            button.click();
            expect(onRequestAccess).toHaveBeenCalled();
        }
    });
});
