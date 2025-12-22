import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { DashboardFilters } from './DashboardFilters';

describe('DashboardFilters', () => {
    const mockOnSearchChange = vi.fn();
    const mockOnEnvironmentChange = vi.fn();
    const mockOnTeamChange = vi.fn();
    const mockTeams = [{ id: 'team-1', name: 'Team Alpha', azureAdGroupId: 'g1', type: 'internal', description: '', memberCount: 1 }] as any[];

    it('renders all filter sections', () => {
        render(
            <DashboardFilters
                searchQuery=""
                onSearchChange={mockOnSearchChange}
                selectedEnvironment="ALL"
                onEnvironmentChange={mockOnEnvironmentChange}
                activeTeamId="all"
                onTeamChange={mockOnTeamChange}
                userTeams={mockTeams}
                accessibleEnvironments={['DEV', 'QA', 'STAGE', 'PROD']}
            />
        );

        expect(screen.getByText(/Universal Search/i)).toBeTruthy();
        expect(screen.getByText(/Environment Context/i)).toBeTruthy();
        expect(screen.getByText(/Team Ownership/i)).toBeTruthy();
    });

    it('calls onSearchChange when typing in search input', () => {
        render(
            <DashboardFilters
                searchQuery=""
                onSearchChange={mockOnSearchChange}
                selectedEnvironment="ALL"
                onEnvironmentChange={mockOnEnvironmentChange}
                activeTeamId="all"
                onTeamChange={mockOnTeamChange}
                userTeams={mockTeams}
                accessibleEnvironments={['DEV', 'QA', 'STAGE', 'PROD']}
            />
        );

        const input = screen.getByPlaceholderText(/Find an interface/i);
        fireEvent.change(input, { target: { value: 'test query' } });

        expect(mockOnSearchChange).toHaveBeenCalledWith('test query');
    });

    it('disables environment select when specified', () => {
        render(
            <DashboardFilters
                searchQuery=""
                onSearchChange={mockOnSearchChange}
                selectedEnvironment="ALL"
                onEnvironmentChange={mockOnEnvironmentChange}
                activeTeamId="all"
                onTeamChange={mockOnTeamChange}
                userTeams={mockTeams}
                accessibleEnvironments={['DEV', 'QA', 'STAGE', 'PROD']}
                isFiltersDisabled={{ environment: true }}
            />
        );

        const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
        // Environment is first select in the grid structure
        expect(selects[0].disabled).toBe(true);
    });
});
