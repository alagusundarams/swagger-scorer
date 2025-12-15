import React, { useEffect } from 'react';
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

    useEffect(() => {
        if (isAuthenticated && authUser) {
            setUser(authUser);
        }
    }, [isAuthenticated, authUser, setUser]);

    return (
        <div className="min-h-screen flex flex-col bg-gray-50 text-gray-900">
            <Header />
            {/* <Breadcrumbs /> - Temporarily removed due to rendering issues */}
            <div className="flex-1">
                {children}
            </div>
            <Footer />
        </div>
    );
};
