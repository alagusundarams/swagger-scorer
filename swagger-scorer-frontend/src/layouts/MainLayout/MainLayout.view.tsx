import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../Header/Header.view';
import { Footer } from '../Footer/Footer.view';
import { Breadcrumbs } from './Breadcrumbs';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useStore } from '../../store/useStore';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user: authUser, isAuthenticated, getToken } = useAuth();
    const { setUser, fetchInitialData } = useStore();
    const location = useLocation();

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

    // Determine page name from route
    const getPageName = () => {
        const path = location.pathname;
        if (path === '/') return 'Dashboard';
        if (path.startsWith('/products/')) return 'Product Details';
        if (path.startsWith('/browse')) return 'Browse APIs';
        if (path.startsWith('/onboard')) return 'Onboard Product';
        if (path.startsWith('/analyzer')) return 'API Analyzer';
        return 'Dashboard';
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
            <Header pageName={getPageName()} />
            <Breadcrumbs />
            <div className="flex-1 bg-gray-50">
                {children}
            </div>
            <Footer />
        </div>
    );
};
