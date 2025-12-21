import React, { useEffect } from 'react';
import { Header } from '../Header/Header.view';
import { Footer } from '../Footer/Footer.view';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../hooks/useAuth';
import { useStore } from '../../store/useStore';
import './MainLayout.css';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user: authUser, isAuthenticated, getToken } = useAuth();
    const { setUser, fetchInitialData } = useStore();

    useEffect(() => {
        // Fetch public data (products/teams) always
        // Fetch private data (subscriptions) if authenticated
        fetchInitialData(getToken);
    }, [fetchInitialData, getToken]);

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
