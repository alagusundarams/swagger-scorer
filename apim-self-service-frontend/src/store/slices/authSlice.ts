import { StateCreator } from 'zustand';
import { type User } from '../../types/entities';

export interface AuthSlice {
    user: User | null;
    activeTeamId: string;
    setUser: (user: User | null) => void;
    setActiveTeamId: (id: string) => void;
    logout: () => void;
}

export const createAuthSlice: StateCreator<AuthSlice> = (set) => ({
    user: null,
    activeTeamId: 'all',

    setUser: (user: User | null) => set({ user }),
    setActiveTeamId: (activeTeamId: string) => set({ activeTeamId }),
    logout: () => set({ user: null, activeTeamId: 'all' }),
});
