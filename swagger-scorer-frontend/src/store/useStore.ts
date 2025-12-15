import { create } from 'zustand';
import { User, mockUser } from '../mocks';

interface AppState {
    user: User | null;
    activeTeamId: string;
    setUser: (user: User | null) => void;
    setActiveTeamId: (id: string) => void;
    logout: () => void;
}

export const useStore = create<AppState>((set) => ({
    user: null, // Start null, login will set this
    activeTeamId: 'all',
    setUser: (user) => set({ user }),
    setActiveTeamId: (activeTeamId) => set({ activeTeamId }),
    logout: () => set({ user: null, activeTeamId: 'all' }),
}));
