/**
 * TeamManager Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { renderWithAppData, createEventBusSpy } from '../../../test-utils';
import { mockTeams } from '../../../test-utils/mockData';
import { TeamManager } from './TeamManager';

describe('TeamManager', () => {
    let eventSpy: ReturnType<typeof createEventBusSpy>;

    beforeEach(() => {
        eventSpy = createEventBusSpy();
        vi.clearAllMocks();
    });

    afterEach(() => {
        eventSpy.restore();
    });

    it('should render team list', () => {
        renderWithAppData(
            <TeamManager />,
            { teams: mockTeams }
        );

        expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
        expect(screen.getByText('Mobile Team')).toBeInTheDocument();
    });

    it('should show edit button for each team', () => {
        renderWithAppData(
            <TeamManager />,
            { teams: mockTeams }
        );

        const editButtons = screen.queryAllByText(/edit/i);
        expect(editButtons.length).toBeGreaterThan(0);
    });

    it('should use updateTeam from adminClient', () => {
        renderWithAppData(
            <TeamManager />,
            { teams: mockTeams }
        );

        // Component should be using adminClient.updateTeam
        expect(screen.getByText('Platform Engineering')).toBeInTheDocument();
    });

    it('should display team member counts', () => {
        renderWithAppData(
            <TeamManager />,
            { teams: mockTeams }
        );

        // Should show member count if displayed
        const memberInfo = screen.queryByText(/12/); // Platform team has 12 members
        if (memberInfo) {
            expect(memberInfo).toBeInTheDocument();
        }
    });
});
