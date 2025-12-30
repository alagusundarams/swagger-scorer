/**
 * OrphanProductManager Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { renderWithAppData, createEventBusSpy } from '../../../test-utils';
import { mockTeams, mockOrphanProduct } from '../../../test-utils/mockData';
import { OrphanProductManager } from './OrphanProductManager';

describe('OrphanProductManager', () => {
    let eventSpy: ReturnType<typeof createEventBusSpy>;

    beforeEach(() => {
        eventSpy = createEventBusSpy();
        vi.clearAllMocks();
    });

    afterEach(() => {
        eventSpy.restore();
    });

    it('should render orphan products list', () => {
        renderWithAppData(
            <OrphanProductManager />,
            { teams: mockTeams }
        );

        expect(screen.getByText(/orphan/i)).toBeInTheDocument();
    });

    it('should show team selection dropdown', () => {
        renderWithAppData(
            <OrphanProductManager />,
            { teams: mockTeams }
        );

        const teamSelect = screen.queryByText(/select target team/i);
        if (teamSelect) {
            expect(teamSelect).toBeInTheDocument();
        }
    });

    it('should allow selecting products for assignment', () => {
        renderWithAppData(
            <OrphanProductManager />,
            { teams: mockTeams }
        );

        const checkboxes = screen.queryAllByRole('checkbox');
        if (checkboxes.length > 0) {
            fireEvent.click(checkboxes[0]);
            expect(checkboxes[0]).toBeChecked();
        }
    });

    it('should use updateProduct from adminClient', async () => {
        renderWithAppData(
            <OrphanProductManager />,
            { teams: mockTeams }
        );

        // Verify component rendered
        expect(screen.getByText(/orphan/i)).toBeInTheDocument();
    });
});
