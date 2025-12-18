import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../store/useStore';
import { handleMarkNotificationAsRead } from '../../handlers/notificationHandlers';

interface HeaderProps {
    pageName?: string;
}

export const Header = ({ pageName = 'Dashboard' }: HeaderProps) => {
    const [notificationOpen, setNotificationOpen] = useState(false);
    const [userMenuOpen, setUserMenuOpen] = useState(false);

    // Get data from Zustand store (populated after SSO login)
    const user = useStore((state) => state.user);
    const notifications = useStore((state) => state.notifications);

    const notificationRef = useRef<HTMLDivElement>(null);
    const userMenuRef = useRef<HTMLDivElement>(null);

    // Close dropdowns when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
                setNotificationOpen(false);
            }
            if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
                setUserMenuOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const unreadCount = notifications.filter(n => !n.read).length;

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

                {/* Right Side - Bell + Avatar */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'flex-end' }}>

                    {/* Bell with Notification Dropdown */}
                    <div style={{ position: 'relative' }} ref={notificationRef}>
                        <button
                            onClick={() => setNotificationOpen(!notificationOpen)}
                            style={{
                                padding: '8px',
                                backgroundColor: notificationOpen ? '#334155' : 'transparent',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                            <svg style={{ width: '24px', height: '24px', color: '#cbd5e1' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                            </svg>
                            <span style={{
                                position: 'absolute', top: '4px', right: '4px', width: '20px', height: '20px',
                                backgroundColor: '#ef4444', color: 'white', fontSize: '12px', fontWeight: 'bold',
                                borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                border: '2px solid #1e293b'
                            }}>{unreadCount > 0 ? unreadCount : ''}</span>
                        </button>

                        {/* Notification Dropdown */}
                        {notificationOpen && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '8px',
                                width: '380px',
                                backgroundColor: '#1e293b',
                                border: '1px solid #334155',
                                borderRadius: '12px',
                                boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)',
                                zIndex: 50
                            }}>
                                {/* Header */}
                                <div style={{ padding: '16px', borderBottom: '1px solid #334155', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#f1f5f9' }}>Notifications</span>
                                        {unreadCount > 0 && (
                                            <span style={{ backgroundColor: '#3b82f6', color: 'white', fontSize: '12px', fontWeight: 'bold', padding: '2px 8px', borderRadius: '999px' }}>
                                                {unreadCount}
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Notifications */}
                                <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                                    {notifications.length === 0 ? (
                                        <div style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                                            <svg style={{ width: '48px', height: '48px', margin: '0 auto 12px', opacity: 0.5 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                            </svg>
                                            <p style={{ fontSize: '14px', fontWeight: '500' }}>No notifications</p>
                                        </div>
                                    ) : (
                                        notifications.map((notification) => (
                                            <Link
                                                key={notification.id}
                                                to={notification.navigateTo || '#'}
                                                onClick={async () => {
                                                    await handleMarkNotificationAsRead(notification.id);
                                                    setNotificationOpen(false);
                                                }}
                                                style={{
                                                    display: 'block',
                                                    padding: '16px',
                                                    borderBottom: '1px solid #334155',
                                                    cursor: 'pointer',
                                                    backgroundColor: notification.read ? '#1e293b' : '#1f2937',
                                                    textDecoration: 'none',
                                                    color: 'inherit'
                                                }}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = notification.read ? '#1e293b' : '#1f2937'}>
                                                <div style={{ display: 'flex', gap: '12px' }}>
                                                    <div style={{
                                                        width: '40px',
                                                        height: '40px',
                                                        backgroundColor: notification.type === 'approval' ? '#fef3c7' :
                                                            notification.type === 'success' ? '#d1fae5' :
                                                                notification.type === 'warning' ? '#fee2e2' : '#dbeafe',
                                                        color: notification.type === 'approval' ? '#f59e0b' :
                                                            notification.type === 'success' ? '#10b981' :
                                                                notification.type === 'warning' ? '#ef4444' : '#3b82f6',
                                                        borderRadius: '50%',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        flexShrink: 0
                                                    }}>
                                                        {notification.type === 'approval' ? (
                                                            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : notification.type === 'success' ? (
                                                            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        ) : (
                                                            <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                            </svg>
                                                        )}
                                                    </div>
                                                    <div style={{ flex: 1 }}>
                                                        <p style={{ fontSize: '14px', fontWeight: '600', color: '#f1f5f9', margin: '0 0 4px 0' }}>{notification.title}</p>
                                                        <p style={{ fontSize: '12px', color: '#cbd5e1', margin: '0 0 8px 0' }}>{notification.message}</p>
                                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>{notification.timestamp}</span>
                                                    </div>
                                                    {!notification.read && (
                                                        <div style={{ width: '8px', height: '8px', backgroundColor: '#3b82f6', borderRadius: '50%', flexShrink: 0, marginTop: '4px' }}></div>
                                                    )}
                                                </div>
                                            </Link>
                                        ))
                                    )}
                                </div>

                                {/* Footer - Only show if there are notifications */}
                                {notifications.length > 0 && (
                                    <div style={{ padding: '12px', borderTop: '1px solid #334155', textAlign: 'center' }}>
                                        <Link
                                            to="/approvals"
                                            onClick={() => setNotificationOpen(false)}
                                            style={{
                                                color: '#60a5fa',
                                                fontSize: '14px',
                                                fontWeight: '500',
                                                background: 'none',
                                                border: 'none',
                                                cursor: 'pointer',
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '8px',
                                                display: 'block',
                                                textDecoration: 'none',
                                                textAlign: 'center'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#334155'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                                            View all approvals
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

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
                                    <button style={{
                                        width: '100%', display: 'flex', alignItems: 'center', gap: '12px',
                                        padding: '12px', backgroundColor: 'transparent', border: 'none',
                                        borderRadius: '8px', cursor: 'pointer', color: '#cbd5e1',
                                        fontSize: '14px', fontWeight: '500', textAlign: 'left'
                                    }}
                                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#334155'; e.currentTarget.style.color = '#3b82f6'; }}
                                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = '#cbd5e1'; }}>
                                        <svg style={{ width: '20px', height: '20px' }} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Settings
                                    </button>
                                </div>

                                {/* Sign Out */}
                                <div style={{ padding: '8px', borderTop: '1px solid #334155' }}>
                                    <button style={{
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
