import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardContent } from './DashboardContent';

// Mock the card components to simplify testing
vi.mock('./ProductProducerCard', () => ({
    ProductProducerCard: ({ product }: any) => <div data-testid="producer-card">{product.displayName}</div>
}));
vi.mock('./ProductConsumerCard', () => ({
    ProductConsumerCard: ({ product }: any) => <div data-testid="consumer-card">{product.displayName}</div>
}));
vi.mock('./ApprovalRequestCard', () => ({
    ApprovalRequestCard: ({ request }: any) => <div data-testid="approval-card">{request.id}</div>
}));

describe('DashboardContent', () => {
    const mockNavigate = vi.fn();
    const mockShowToast = vi.fn();
    const mockHandleToggleReveal = vi.fn();
    const mockHandleCopyKey = vi.fn();

    it('renders loading state', () => {
        const { container } = render(
            <DashboardContent
                isLoading={true}
                activeTab="produced"
                paginatedItems={[]}
                revealedKeys={new Set()}
                handleToggleReveal={mockHandleToggleReveal}
                handleCopyKey={mockHandleCopyKey}
                showToast={mockShowToast}
                navigate={mockNavigate}
            />
        );

        const skeletons = container.querySelectorAll('.animate-pulse');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders empty state when no items', () => {
        render(
            <DashboardContent
                isLoading={false}
                activeTab="produced"
                paginatedItems={[]}
                revealedKeys={new Set()}
                handleToggleReveal={mockHandleToggleReveal}
                handleCopyKey={mockHandleCopyKey}
                showToast={mockShowToast}
                navigate={mockNavigate}
            />
        );

        expect(screen.getByText(/No APIs Found/i)).toBeTruthy();
    });

    it('renders producer cards for "produced" tab', () => {
        const items = [{ id: '1', displayName: 'Product 1' }];
        render(
            <DashboardContent
                isLoading={false}
                activeTab="produced"
                paginatedItems={items}
                revealedKeys={new Set()}
                handleToggleReveal={mockHandleToggleReveal}
                handleCopyKey={mockHandleCopyKey}
                showToast={mockShowToast}
                navigate={mockNavigate}
            />
        );

        expect(screen.getByTestId('producer-card')).toBeTruthy();
        expect(screen.getByText('Product 1')).toBeTruthy();
    });

    it('renders consumer cards for "consumed" tab', () => {
        const items = [{ id: '1', displayName: 'Subscribed Product 1' }];
        render(
            <DashboardContent
                isLoading={false}
                activeTab="consumed"
                paginatedItems={items}
                revealedKeys={new Set()}
                handleToggleReveal={mockHandleToggleReveal}
                handleCopyKey={mockHandleCopyKey}
                showToast={mockShowToast}
                navigate={mockNavigate}
            />
        );

        expect(screen.getByTestId('consumer-card')).toBeTruthy();
        expect(screen.getByText('Subscribed Product 1')).toBeTruthy();
    });

    it('renders approval cards for "approvals" tab', () => {
        const items = [{ id: 'approval-1' }];
        render(
            <DashboardContent
                isLoading={false}
                activeTab="approvals"
                paginatedItems={items}
                revealedKeys={new Set()}
                handleToggleReveal={mockHandleToggleReveal}
                handleCopyKey={mockHandleCopyKey}
                showToast={mockShowToast}
                navigate={mockNavigate}
            />
        );

        expect(screen.getByTestId('approval-card')).toBeTruthy();
        expect(screen.getByText('approval-1')).toBeTruthy();
    });
});
