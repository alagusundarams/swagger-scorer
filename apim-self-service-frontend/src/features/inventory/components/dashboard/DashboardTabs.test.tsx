import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DashboardTabs } from './DashboardTabs';

describe('DashboardTabs', () => {
    it('renders the core navigation tabs', () => {
        render(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="produced"
                    onTabChange={vi.fn()}
                    pendingApprovalsCount={0}
                    showAdminTab={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/MANAGED PRODUCTS/i)).toBeTruthy();
        expect(screen.getByText(/ACTIVE SUBSCRIPTIONS/i)).toBeTruthy();
    });

    it('shows the Admin tab when showAdminTab is true', () => {
        render(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="produced"
                    onTabChange={vi.fn()}
                    pendingApprovalsCount={0}
                    showAdminTab={true}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/GLOBAL INVENTORY/i)).toBeTruthy();
    });

    it('shows the Approvals tab when there are pending approvals', () => {
        render(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="produced"
                    onTabChange={vi.fn()}
                    pendingApprovalsCount={5}
                    showAdminTab={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/APPROVALS/i)).toBeTruthy();
        expect(screen.getByText('5')).toBeTruthy();
    });

    it('calls onTabChange when a tab is clicked', () => {
        const onTabChangeMock = vi.fn();
        render(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="produced"
                    onTabChange={onTabChangeMock}
                    pendingApprovalsCount={0}
                    showAdminTab={false}
                />
            </MemoryRouter>
        );

        const consumedTab = screen.getByText(/ACTIVE SUBSCRIPTIONS/i);
        fireEvent.click(consumedTab);

        expect(onTabChangeMock).toHaveBeenCalledWith('consumed');
    });

    it('shows the Register button only when "produced" tab is active', () => {
        const { rerender } = render(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="produced"
                    onTabChange={vi.fn()}
                    pendingApprovalsCount={0}
                    showAdminTab={false}
                />
            </MemoryRouter>
        );

        expect(screen.getByText(/REGISTER NEW API/i)).toBeTruthy();

        rerender(
            <MemoryRouter>
                <DashboardTabs
                    activeTab="consumed"
                    onTabChange={vi.fn()}
                    pendingApprovalsCount={0}
                    showAdminTab={false}
                />
            </MemoryRouter>
        );

        expect(screen.queryByText(/REGISTER NEW API/i)).toBeNull();
        expect(screen.getByText(/EXPLORE ECOSYSTEM/i)).toBeTruthy();
    });
});
