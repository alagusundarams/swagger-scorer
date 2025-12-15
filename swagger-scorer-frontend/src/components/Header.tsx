import React from 'react';
import { useAuth } from '../auth/useAuth';
import { useStore } from '../store/useStore';
import { LoginButton } from './LoginButton';

interface HeaderProps {
    title?: string;
    subtitle?: string;
    children?: React.ReactNode;
}

export const Header: React.FC<HeaderProps> = () => {
    const { isAuthenticated, logout: authLogout } = useAuth(); // Keep auth mechanics
    const { user, logout: storeLogout } = useStore(); // Read user from Store

    const handleLogout = () => {
        authLogout();
        storeLogout();
    };

    return (
        <header className="flex flex-col md:flex-row justify-between items-center gap-4 animate-fade-in px-6 py-4 bg-white border-b border-corp-border shrink-0 z-20 sticky top-0 h-16">
            {/* Title / Brand */}
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold shadow-sm">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>
                    <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-none">APIM Self Service</h1>

                </div>
            </div>

            {/* Auth Controls */}
            <div className="flex items-center gap-4">
                {(!isAuthenticated && !user) ? (
                    <LoginButton />
                ) : (
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-gray-900">{user?.name || 'User'}</p>
                            <button
                                onClick={handleLogout}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            >
                                Sign out
                            </button>
                        </div>
                        <div className="w-9 h-9 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm">
                            {user?.name?.charAt(0) || 'U'}
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};
