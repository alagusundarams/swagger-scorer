import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { useAuth } from '../../features/auth/hooks/useAuth';

interface HeaderProps {
    pageName?: string;
}

export const Header = ({ pageName = 'Dashboard' }: HeaderProps) => {
    const navigate = useNavigate();
    const { logout: authLogout } = useAuth();
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Get data from Zustand store (populated after SSO login)
    const user = useStore((state) => state.user);
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

    // Use default values if user not logged in yet
    const displayName = user?.name || 'User';
    const displayEmail = user?.email || '';
    const userInitial = displayName.charAt(0).toUpperCase();

    return (
        <header style={{
            position: 'sticky',
            top: 0,
            zIndex: 40,
            backgroundColor: '#1e293b',
            borderBottom: '2px solid #64748b',
            boxShadow: '0 2px 4px 0 rgba(0, 0, 0, 0.4)'
        }}>
            <div style={{
                maxWidth: '1920px',
                margin: '0 auto',
                padding: '0 24px',
                height: '64px',
                display: 'grid',
                gridTemplateColumns: '1fr auto 1fr',
                alignItems: 'center',
                gap: '16px'
            }}>

                {/* Left Side - Everest Re Logo + APIM Self Service + Nav Links */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>

                    {/* Brand Group */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '120px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: '6px',
                            padding: '8px'
                        }}>
                            <img
                                src="https://www.everestglobal.com/ca-en/-/media/evre/company-logos/everest-logo-header.ashx"
                                alt="Everest Re"
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'contain',
                                    filter: 'brightness(0) invert(1)'
                                }}
                            />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{
                                width: '32px',
                                height: '32px',
                                background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                                borderRadius: '8px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}>
                                <svg style={{ width: '18px', height: '18px', color: 'white' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#cbd5e1' }}>
                                APIM Self Service
                            </span>
                        </div>
                    </div>

                    {/* Navigation Links (Inside Left Column) */}
                    <div style={{ display: 'flex', gap: '24px', borderLeft: '1px solid #334155', paddingLeft: '24px', height: '32px', alignItems: 'center' }}>
                        <Link to="/" style={{ color: pageName === 'Dashboard' ? '#60a5fa' : '#94a3b8', fontWeight: '600', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}>
                            <span>📊</span> Dashboard
                        </Link>
                        <Link to="/catalog" style={{ color: pageName === 'Marketplace' ? '#60a5fa' : '#94a3b8', fontWeight: '600', fontSize: '14px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px', transition: 'color 0.2s' }}>
                            <span>🛒</span> Marketplace
                        </Link>
                    </div>

                </div>

                {/* CENTER - Page Name */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <span style={{ fontSize: '20px', fontWeight: 'bold', color: '#f1f5f9', lineHeight: 1, whiteSpace: 'nowrap' }}>
                        {pageName}
                    </span>
                </div>

                {/* Right Side - Avatar Only */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>

                    {/* User Avatar with Menu */}
                    <div style={{ position: 'relative' }} ref={userMenuRef}>
                        <button
                            onClick={() => setUserMenuOpen(!userMenuOpen)}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                backgroundColor: userMenuOpen ? '#334155' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                padding: '6px',
                                cursor: 'pointer'
                            }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '50%',
                                background: 'linear-gradient(to bottom right, #3b82f6, #2563eb)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: 'white', fontSize: '14px', fontWeight: 'bold',
                                boxShadow: '0 2px 4px rgba(59, 130, 246, 0.3)'
                            }}>{userInitial}</div>
                        </button>

                        {/* User Menu Dropdown */}
                        {userMenuOpen && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '8px',
                                width: '240px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                                zIndex: 50
                            }}>
                                {/* User Info */}
                                <div style={{ padding: '16px', borderBottom: '1px solid #334155' }}>
                                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: '#f1f5f9', margin: '0 0 4px 0' }}>{displayName}</p>
                                    <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>{displayEmail}</p>
                                </div>

                                {/* Menu Items */}
                                <div style={{ padding: '8px' }}>
                                    <button style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px', backgroundColor: 'transparent', border: 'none',
                                        borderRadius: '8px', cursor: 'pointer', color: '#cbd5e1',
                                        fontSize: '14px', fontWeight: '500', textAlign: 'left'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#3b82f6'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}>
                                        <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Team Preference
                                    </button>
                                </div>

                                {/* Sign Out */}
                                <div style={{ padding: '8px', borderTop: '1px solid #334155' }}>
                                    <button
                                        onClick={() => {
                                            storeLogout(); // Clear Zustand state
                                            authLogout(); // Clear auth session
                                            navigate('/login');
                                        }}
                                        style={{
                                            width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                            padding: '12px', backgroundColor: 'transparent', border: 'none',
                                            borderRadius: '8px', cursor: 'pointer', color: '#f87171',
                                            fontSize: '14px', fontWeight: '600', textAlign: 'left'
                                        }}
                                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#7f1d1d'}
                                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                        <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
