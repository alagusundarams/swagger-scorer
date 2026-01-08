import React, { useEffect } from 'react';
import { Header } from '../Header/Header.view';
import { Footer } from '../Footer/Footer.view';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useStore } from '../../store/useStore';
import './MainLayout.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

/**
 * MainLayout
 * 
 * ------------------------------------------------------------------
 * 📍 Purpose:
 * The primary shell for Authenticated Pages.
 * Wraps content with the standard Header, Footer, and Breadcrumb navigation.
 * 
 * 🔄 Responsibilities:
 * 1. Visual Shell (Header/Footer).
 * 2. Auth State Synchronization (Syncs `useAuth` provided user to `useStore`).
 * 3. Context Initialization (Sets default Active Team ID).
 * ------------------------------------------------------------------
 */
export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user: authUser, isAuthenticated } = useAuth();
    const { setUser } = useStore();
    // Layout level fetching removed. Specialized stores are now fetched at the view level for better functional isolation.

    useEffect(() => {
        // No-op - decentralized stores are fetched in views
    }, []);

    useEffect(() => {
        if (isAuthenticated && authUser) {
            setUser(authUser);
            // Sync activeTeamId to ensure correct view context
            if (authUser.role === 'admin') {
                // Admin starts with global view by default
                // No action needed as default is 'all', but existing state logic handles it
            } else if (authUser.defaultTeamId) {
                // Producers/Consumers MUST start with their team context
                // otherwise they see the "all" view which returns nothing for them
                // or incorrectly shows the "Same Screen" as admin
                useStore.getState().setActiveTeamId(authUser.defaultTeamId);
            }
        }
    }, [isAuthenticated, authUser, setUser]);

    return (
        <div className="main-layout">
            <Header />
            <Breadcrumbs />
            <div className="main-content">
                {children}
            </div>
            <Footer />
        </div>
    );
};
