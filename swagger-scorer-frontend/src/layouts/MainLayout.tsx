import React, { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from '../components/Header';
import { Footer } from '../components/Footer';
import { Breadcrumbs } from '../components/Breadcrumbs';
import { useAuth } from '../auth/useAuth';
import { useStore } from '../store/useStore';

interface MainLayoutProps {
    children: React.ReactNode;
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
    const { user: authUser, isAuthenticated } = useAuth();
    const { setUser } = useStore();
    const location = useLocation();

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
