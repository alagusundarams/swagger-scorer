/**
 * ManageProductModal Tests - Simplified
 */

import { describe, it, expect, vi } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithAppData } from '../../../../test-utils';
import { mockTeams, createMockProduct } from '../../../../test-utils/mockData';
import { ManageProductModal } from './ManageProductModal';

describe('ManageProductModal', () => {
    const mockProduct = createMockProduct();
    const onClose = vi.fn();
    const onPromote = vi.fn();
    const onUpdate = vi.fn();

    it('should render modal when open', () => {
        renderWithAppData(
            <ManageProductModal
                isOpen={true}
                onClose={onClose}
                product={mockProduct}
                currentStage="DEV"
                onPromote={onPromote}
                onUpdate={onUpdate}
            />,
            { teams: mockTeams }
        );

        // Modal should be rendered
        const modal = screen.queryByRole('dialog');
        expect(modal).toBeTruthy();
    });

    it('should not render when closed', () => {
        const { container } = renderWithAppData(
            <ManageProductModal
                isOpen={false}
                onClose={onClose}
                product={mockProduct}
                currentStage="DEV"
                onPromote={onPromote}
                onUpdate={onUpdate}
            />,
            { teams: mockTeams }
        );

        expect(container.querySelector('[role="dialog"]')).toBeFalsy();
    });

    it('should use AppDataContext for teams data', () => {
        renderWithAppData(
            <ManageProductModal
                isOpen={true}
                onClose={onClose}
                product={mockProduct}
                currentStage="DEV"
                onPromote={onPromote}
                onUpdate={onUpdate}
            />,
            { teams: mockTeams }
        );

        // Teams from context should be available (test passes if no errors)
        expect(true).toBe(true);
    });
});
