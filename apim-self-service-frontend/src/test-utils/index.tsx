/**
 * Test Utilities
 * 
 * Reusable helpers for testing components with MFE architecture.
 * Provides wrappers for AppDataContext, event bus spies, and rendering utilities.
 */

import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import { AppDataProvider } from '../shared/context/AppDataContext';
import { eventBus } from '../shared/events/eventBus';
import type { Team, Environment } from '../shared/types/domain';

/**
 * Custom render function that wraps components with AppDataProvider
 * 
 * @param ui - Component to render
 * @param options - Render options including mock teams and environments
 * @returns Render result with all @testing-library/react utilities
 * 
 * @example
 * ```typescript
 * const { getByText } = renderWithAppData(
 *   <MyComponent />,
 *   { teams: [mockTeam], environments: ['dev', 'qa'] }
 * );
 * ```
 */
export function renderWithAppData(
    ui: ReactElement,
    {
        teams = [],
        environments = [] as Environment[],
        ...renderOptions
    }: Omit<RenderOptions, 'wrapper'> & {
        teams?: Team[];
        environments?: Environment[];
    } = {}
) {
    function Wrapper({ children }: { children: React.ReactNode }) {
        return (
            <AppDataProvider
                teamsApi={{ getTeams: async () => teams }}
                environmentsApi={{ getEnvironments: async () => environments }}
            >
                {children}
            </AppDataProvider>
        );
    }

    return render(ui, { wrapper: Wrapper, ...renderOptions });
}

/**
 * Event bus spy for testing event emissions
 * 
 * Captures all events emitted during a test and provides
 * utilities for asserting on them.
 * 
 * @returns Object with emissions array and restore function
 * 
 * @example
 * ```typescript
 * const spy = createEventBusSpy();
 * 
 * // Perform action that emits event
 * await updateTeam('team-1', { name: 'Updated' });
 * 
 * // Assert event was emitted
 * expect(spy.emissions).toHaveLength(1);
 * expect(spy.emissions[0]).toEqual({
 *   type: 'team:updated',
 *   payload: { teamId: 'team-1', team: expect.any(Object) }
 * });
 * 
 * // Clean up
 * spy.restore();
 * ```
 */
export function createEventBusSpy() {
    const emissions: Array<{ type: string; payload: any }> = [];
    const originalEmit = eventBus.emit.bind(eventBus);

    // Replace emit with spy version
    eventBus.emit = (type: any, payload: any) => {
        emissions.push({ type, payload });
        return originalEmit(type, payload);
    };

    return {
        /** Array of all emitted events */
        emissions,

        /** Restore original emit function */
        restore: () => {
            eventBus.emit = originalEmit;
        },

        /** Clear emissions array without restoring */
        clear: () => {
            emissions.length = 0;
        },

        /** Find emission by type */
        findEmission: (type: string) => {
            return emissions.find(e => e.type === type);
        },

        /** Get all emissions of a specific type */
        getEmissions: (type: string) => {
            return emissions.filter(e => e.type === type);
        }
    };
}

/**
 * Wait for AppDataContext to finish loading
 * Useful when testing components that depend on context data
 * 
 * @param timeout - Maximum time to wait in ms
 */
export async function waitForAppDataLoaded(timeout = 1000) {
    return new Promise((resolve) => {
        const start = Date.now();
        const check = () => {
            if (Date.now() - start > timeout) {
                resolve(false);
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

/**
 * Create a mock API client for testing
 * 
 * @example
 * ```typescript
 * const mockApi = createMockApiClient({
 *   getTeams: vi.fn().mockResolvedValue([mockTeam]),
 *   updateTeam: vi.fn().mockResolvedValue(mockTeam)
 * });
 * ```
 */
export function createMockApiClient<T extends Record<string, any>>(
    methods: Partial<T>
): T {
    return methods as T;
}
