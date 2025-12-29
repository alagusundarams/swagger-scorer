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
