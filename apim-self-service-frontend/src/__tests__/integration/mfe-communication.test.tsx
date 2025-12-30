/**
 * IntegrationTests - MFE Communication
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { createEventBusSpy } from '../../test-utils';
import { AppDataProvider, useAppData } from '../../shared/context/AppDataContext';
import { eventBus } from '../../shared/events/eventBus';
import { mockTeams, mockEnvironments, createMockTeam } from '../../test-utils/mockData';

describe('MFE Communication Integration', () => {
    let eventSpy: ReturnType<typeof createEventBusSpy>;

    beforeEach(() => {
        eventSpy = createEventBusSpy();
    });

    afterEach(() => {
        eventSpy.restore();
    });

    it('should trigger AppDataContext refresh when team:updated is emitted', async () => {
        let callCount = 0;
        const getTeamsMock = async () => {
            callCount++;
            return callCount === 1 ? [mockTeams[0]] : mockTeams;
        };

        function TestComponent() {
            const { teams } = useAppData();
            return <div data-testid="team-count">{teams.length}</div>;
        }

        const { getByTestId } = render(
            <AppDataProvider
                teamsApi={{ getTeams: getTeamsMock }}
                environmentsApi={{ getEnvironments: async () => mockEnvironments }}
            >
                <TestComponent />
            </AppDataProvider>
        );

        await waitFor(() => {
            expect(getByTestId('team-count').textContent).toBe('1');
        });

        // Emit team:updated event
        eventBus.emit('team:updated', {
            teamId: 'team-new',
            team: createMockTeam({ id: 'team-new' }),
        });

        await waitFor(() => {
            expect(getByTestId('team-count').textContent).toBe('3');
        });
    });
});
