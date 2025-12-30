/**
 * AppDataContext - Shared Read-Only Data Access
 * 
 * Provides read-only access to commonly-needed data (teams, environments)
 * without violating MFE boundaries.
 * 
 * @architecture
 * - **Read-Only**: Components can read data but NOT mutate it
 * - **Centrally Loaded**: Data is fetched once at the app root
 * - **Type-Safe**: All data is strongly typed
 * - **MFE-Compliant**: Features don't import each other's stores
 * 
 * @usage
 * ```typescript
 * // In a component
 * import { useAppData } from '@/shared/context/AppDataContext';
 * 
 * function MyComponent() {
 *   const { teams, environments } = useAppData();
 *   
 *   return (
 *     <select>
 *       {teams.map(team => (
 *         <option key={team.id} value={team.id}>
 *           {team.name}
 *         </option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 * 
 * @important
 * This context is for **DISPLAY PURPOSES ONLY**. To modify data:
 * 1. Use your feature's own API client
 * 2. Emit an event when done
 * 3. The root provider will refresh the context
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { Team, Environment } from '../types/domain';
import { eventBus } from '../events/eventBus';

/**
 * Shape of the shared application data
 */
interface AppData {
    /** All teams in the system (read-only) */
    teams: Team[];
    /** All environments (dev, qa, prod) (read-only) */
    environments: Environment[];
    /** Whether data is currently loading */
    isLoading: boolean;
    /** Manually refresh all data */
    refresh: () => Promise<void>;
}

/**
 * Default empty state
 */
const defaultAppData: AppData = {
    teams: [],
    environments: [],
    isLoading: true,
    refresh: async () => { },
};

/**
 * React Context instance
 */
const AppDataContext = createContext<AppData>(defaultAppData);

/**
 * Props for the AppDataProvider component
 */
interface AppDataProviderProps {
    children: React.ReactNode;
    /** Custom teams API client (for testing) */
    teamsApi?: {
        getTeams: () => Promise<Team[]>;
    };
    /** Custom environments API client (for testing) */
    environmentsApi?: {
        getEnvironments: () => Promise<Environment[]>;
    };
}

/**
 * AppDataProvider Component
 * 
 * Wraps your app root to provide shared data to all components.
 * Automatically refreshes data when relevant events are emitted.
 * 
 * @example
 * ```typescript
 * // In App.tsx
 * import { AppDataProvider } from '@/shared/context/AppDataContext';
 * 
 * function App() {
 *   return (
 *     <AppDataProvider>
 *       <YourApp />
 *     </AppDataProvider>
 *   );
 * }
 * ```
 */
export const AppDataProvider: React.FC<AppDataProviderProps> = ({
    children,
    teamsApi,
    environmentsApi
}) => {
    const [teams, setTeams] = useState<Team[]>([]);
    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    /**
     * Fetch all shared data
     */
    const fetchData = useCallback(async () => {
        setIsLoading(true);
        try {
            // In production, these would be actual API calls
            // For now, we'll use the provided APIs or fetch from the teamsStore
            const [teamsData, envsData] = await Promise.all([
                teamsApi ? teamsApi.getTeams() : fetchTeamsFromApi(),
                environmentsApi ? environmentsApi.getEnvironments() : fetchEnvironmentsFromApi(),
            ]);

            setTeams(teamsData);
            setEnvironments(envsData);
        } catch (error) {
            console.error('[AppDataContext] Failed to fetch data:', error);
        } finally {
            setIsLoading(false);
        }
    }, [teamsApi, environmentsApi]);

    /**
     * Refresh data (can be called manually or via events)
     */
    const refresh = useCallback(async () => {
        await fetchData();
    }, [fetchData]);

    /**
     * Initial data load
     */
    useEffect(() => {
        fetchData();
    }, [fetchData]);

    /**
     * Subscribe to data change events
     */
    useEffect(() => {
        // Refresh teams when a team changes
        const unsubscribeTeamCreated = eventBus.on('team:created', () => {
            refresh();
        });

        const unsubscribeTeamUpdated = eventBus.on('team:updated', () => {
            refresh();
        });

        const unsubscribeTeamDeleted = eventBus.on('team:deleted', () => {
            refresh();
        });

        // Refresh on generic data refresh requests
        const unsubscribeDataRefresh = eventBus.on('data:refresh', (payload) => {
            if (payload.dataType === 'teams' || payload.dataType === 'all') {
                refresh();
            }
        });

        // Cleanup subscriptions on unmount
        return () => {
            unsubscribeTeamCreated();
            unsubscribeTeamUpdated();
            unsubscribeTeamDeleted();
            unsubscribeDataRefresh();
        };
    }, [refresh]);

    const value: AppData = {
        teams,
        environments,
        isLoading,
        refresh,
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};

/**
 * Hook to access shared application data
 * 
 * @returns Read-only teams and environments data
 * 
 * @example
 * ```typescript
 * function TeamSelector() {
 *   const { teams, isLoading } = useAppData();
 *   
 *   if (isLoading) return <div>Loading...</div>;
 *   
 *   return (
 *     <select>
 *       {teams.map(team => (
 *         <option key={team.id}>{team.name}</option>
 *       ))}
 *     </select>
 *   );
 * }
 * ```
 * 
 * @important
 * This hook provides READ-ONLY data. To modify:
 * 1. Use your feature's API client
 * 2. Emit an event when done
 * 3. This context will auto-refresh
 */
export const useAppData = (): AppData => {
    const context = useContext(AppDataContext);

    if (context === defaultAppData) {
        console.warn(
            '[useAppData] Used outside of AppDataProvider. ' +
            'Wrap your app with <AppDataProvider> at the root.'
        );
    }

    return context;
};

/**
 * Helper: Fetch teams from the API
 * This will be replaced with actual API calls
 */
async function fetchTeamsFromApi(): Promise<Team[]> {
    try {
        const res = await fetch('/api/v1/teams');
        if (!res.ok) return [];
        return await res.json();
    } catch {
        return [];
    }
}

/**
 * Helper: Fetch environments from the API
 * This will be replaced with actual API calls
 */
async function fetchEnvironmentsFromApi(): Promise<Environment[]> {
    try {
        const res = await fetch('/api/v1/environments');
        if (!res.ok) return ['dev' as Environment, 'qa' as Environment, 'prod' as Environment];
        return await res.json();
    } catch {
        return ['dev' as Environment, 'qa' as Environment, 'prod' as Environment];
    }
}
