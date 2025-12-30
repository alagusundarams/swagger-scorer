/**
 * AppDataContext Tests
 * 
 * Tests for the shared context that provides read-only
 * access to teams and environments across the application.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { renderWithAppData, createEventBusSpy } from '../../test-utils';
import { AppDataProvider, useAppData } from './AppDataContext';
import { mockTeams, mockEnvironments } from '../../test-utils/mockData';

// Test component that uses the context
function TestComponent() {
    const { teams, environments, isLoading } = useAppData();

    if (isLoading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <div data-testid="teams-count">{teams.length}</div>
            <div data-testid="environments-count">{environments.length}</div>
            {teams.map(team => (
                <div key={team.id} data-testid={`team-${team.id}`}>
                    {team.name}
                </div>
            ))}
        </div>
    );
}

describe('AppDataContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('provider', () => {
        it('should provide teams and environments', async () => {
            render(
                <AppDataProvider
                    teamsApi={{ getTeams: async () => mockTeams }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            // Wait for loading to complete
            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            expect(screen.getByTestId('teams-count')).toHaveTextContent('3');
            expect(screen.getByTestId('environments-count')).toHaveTextContent('3');
            expect(screen.getByTestId('team-team-platform')).toHaveTextContent('Platform Engineering');
        });

        it('should show loading state initially', () => {
            render(
                <AppDataProvider
                    teamsApi={{ getTeams: async () => new Promise(() => { }) }} // Never resolves
                    environmentsApi={{ getEnvironments: async () => new Promise(() => { }) }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            expect(screen.getByText('Loading...')).toBeInTheDocument();
        });

        it('should handle API errors gracefully', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: async () => { throw new Error('API Error'); } }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            // Should not crash, just log error
            expect(consoleErrorSpy).toHaveBeenCalled();
            expect(screen.getByTestId('teams-count')).toHaveTextContent('0');

            consoleErrorSpy.mockRestore();
        });
    });

    describe('event-driven refresh', () => {
        it('should refresh teams when team:created event is emitted', async () => {
            const eventBusSpy = createEventBusSpy();
            let callCount = 0;
            const getTeamsMock = vi.fn(async () => {
                callCount++;
                return callCount === 1 ? mockTeams.slice(0, 2) : mockTeams;
            });

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: getTeamsMock }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            // Wait for initial load
            await waitFor(() => {
                expect(screen.getByTestId('teams-count')).toHaveTextContent('2');
            });

            // Emit team:created event
            const { eventBus } = await import('./eventBus');
            eventBus.emit('team:created', {
                team: mockTeams[2],
            });

            // Wait for refresh
            await waitFor(() => {
                expect(screen.getByTestId('teams-count')).toHaveTextContent('3');
            });

            expect(getTeamsMock).toHaveBeenCalledTimes(2);

            eventBusSpy.restore();
        });

        it('should refresh teams when team:updated event is emitted', async () => {
            const eventBusSpy = createEventBusSpy();
            const getTeamsMock = vi.fn(async () => mockTeams);

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: getTeamsMock }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            const { eventBus } = await import('./eventBus');
            eventBus.emit('team:updated', {
                teamId: mockTeams[0].id,
                team: { ...mockTeams[0], name: 'Updated Team' },
            });

            await waitFor(() => {
                expect(getTeamsMock).toHaveBeenCalledTimes(2);
            });

            eventBusSpy.restore();
        });

        it('should refresh teams when team:deleted event is emitted', async () => {
            const eventBusSpy = createEventBusSpy();
            const getTeamsMock = vi.fn(async () => mockTeams);

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: getTeamsMock }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            const { eventBus } = await import('./eventBus');
            eventBus.emit('team:deleted', {
                teamId: mockTeams[0].id,
            });

            await waitFor(() => {
                expect(getTeamsMock).toHaveBeenCalledTimes(2);
            });

            eventBusSpy.restore();
        });

        it('should refresh on data:refresh event with teams dataType', async () => {
            const eventBusSpy = createEventBusSpy();
            const getTeamsMock = vi.fn(async () => mockTeams);

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: getTeamsMock }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <TestComponent />
                </AppDataProvider>
            );

            await waitFor(() => {
                expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
            });

            const { eventBus } = await import('./eventBus');
            eventBus.emit('data:refresh', {
                dataType: 'teams',
            });

            await waitFor(() => {
                expect(getTeamsMock).toHaveBeenCalledTimes(2);
            });

            eventBusSpy.restore();
        });
    });

    describe('useAppData hook', () => {
        it('should provide teams and environments from context', async () => {
            const { getByTestId } = renderWithAppData(
                <TestComponent />,
                { teams: mockTeams, environments: mockEnvironments }
            );

            await waitFor(() => {
                expect(getByTestId('teams-count')).toHaveTextContent('3');
            });
        });

        it('should warn when used outside provider', () => {
            const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => { });

            render(<TestComponent />);

            expect(consoleWarnSpy).toHaveBeenCalledWith(
                expect.stringContaining('Used outside of AppDataProvider')
            );

            consoleWarnSpy.mockRestore();
        });
    });

    describe('manual refresh', () => {
        it('should allow manual refresh via refresh function', async () => {
            function RefreshTestComponent() {
                const { teams, refresh } = useAppData();

                return (
                    <div>
                        <div data-testid="teams-count">{teams.length}</div>
                        <button onClick={() => refresh()}>Refresh</button>
                    </div>
                );
            }

            const getTeamsMock = vi.fn(async () => mockTeams);

            render(
                <AppDataProvider
                    teamsApi={{ getTeams: getTeamsMock }}
                    environmentsApi={{ getEnvironments: async () => mockEnvironments }}
                >
                    <RefreshTestComponent />
                </AppDataProvider>
            );

            await waitFor(() => {
                expect(screen.getByTestId('teams-count')).toHaveTextContent('3');
            });

            expect(getTeamsMock).toHaveBeenCalledTimes(1);

            // Click refresh button
            const refreshButton = screen.getByText('Refresh');
            refreshButton.click();

            await waitFor(() => {
                expect(getTeamsMock).toHaveBeenCalledTimes(2);
            });
        });
    });
});
