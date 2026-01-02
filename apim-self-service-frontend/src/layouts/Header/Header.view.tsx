import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { useStore } from '../../store/useStore';
import './Header.css';

export const Header = () => {
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Get data from Zustand store
    const user = useStore((state) => state.user);
    const pageTitle = useStore((state) => state.pageTitle);
    const storeLogout = useStore((state) => state.logout);

    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close user menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const displayName = user?.name || 'User';
    const displayEmail = user?.email || '';
    const userInitial = displayName.charAt(0).toUpperCase();

    return (
        <header className="app-header">
            <div className="header-container">
                {/* Left Side - Brand + Nav */}
                <div className="header-left">
                    <div className="brand-group">
                        <div className="everest-logo-container">
                            <img
                                src="https://www.everestglobal.com/ca-en/-/media/evre/company-logos/everest-logo-header.ashx"
                                alt="Everest Re"
                                className="everest-logo"
                            />
                        </div>
                        <div className="apim-brand" onClick={() => navigate('/')}>
                            <div className="apim-icon-box">
                                <svg className="apim-icon" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    <text x="12" y="14.5" fill="#fbbf24" fontSize="16" fontWeight="900" textAnchor="middle" dominantBaseline="middle" className="apim-icon-letter">A</text>
                                </svg>
                            </div>
                            <span className="apim-label">APIM Self Service</span>
                        </div>
                    </div>
                </div>

                {/* CENTER - Status & Page Name */}
                <div className="header-center">
                    <div className="status-badge live">
                        🌐 Live Database
                    </div>
                    <span className="page-title">{pageTitle}</span>
                </div>

                {/* Right Side - Avatar Only */}
                <div className="header-right">
                    <div className="user-menu-wrapper" ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            className={`user-menu-trigger ${userMenuOpen ? 'active' : ''}`}
                        >
                            <div className="user-initial-avatar">{userInitial}</div>
                        </button>

                        {/* User Menu Dropdown */}
                        {userMenuOpen && (
                            <div className="user-dropdown">
                                <div className="user-info-section">
                                    <p className="user-name">{displayName}</p>
                                    <p className="user-email">{displayEmail}</p>
                                </div>

                                <div className="menu-items-section">
                                    <button className="menu-item">
                                        <svg className="header-menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Team Preference
                                    </button>
                                </div>

                                <div className="sign-out-section">
                                    <button
                                        onClick={() => {
                                            storeLogout();
                                            authLogout();
                                            navigate('/login');
                                        }}
                                        className="sign-out-button"
                                    >
                                        <svg className="header-menu-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                        </svg>
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </header>
    );
};
