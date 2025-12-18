import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { Notification } from '../../types/notifications';

interface NotificationDropdownProps {
    notifications: Notification[];
    onClose: () => void;
    onMarkAsRead: (id: string) => void;
    onMarkAllRead: () => void;
}

export const NotificationDropdown: React.FC<NotificationDropdownProps> = ({
    notifications,
    onClose,
    onMarkAsRead,
    onMarkAllRead
}) => {
    const navigate = useNavigate();
    const unreadCount = notifications.filter(n => !n.read).length;

    const handleNotificationClick = (notification: Notification) => {
        onMarkAsRead(notification.id);
        navigate(notification.navigateTo);
        onClose();
    };

    const getIcon = (type: Notification['type']) => {
        switch (type) {
            case 'approval':
                return (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'success':
                return (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            case 'warning':
                return (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                );
            case 'error':
                return (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
            default:
                return (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                );
        }
    };

    return (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 max-h-[500px] overflow-hidden">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
                <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900">Notifications</h3>
                    {unreadCount > 0 && (
                        <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                            {unreadCount}
                        </span>
                    )}
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={onMarkAllRead}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                        Mark all read
                    </button>
                )}
            </div>

            {/* Notifications List */}
            <div className="overflow-y-auto max-h-[400px]">
                {notifications.length === 0 ? (
                    <div className="p-8 text-center">
                        <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                        </svg>
                        <p className="text-sm text-gray-500 font-medium">No notifications</p>
                        <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                    </div>
                ) : (
                    notifications.map(notification => (
                        <div
                            key={notification.id}
                            onClick={() => handleNotificationClick(notification)}
                            className={`p-4 border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors group ${!notification.read ? 'bg-blue-50/50' : ''
                                }`}
                        >
                            <div className="flex gap-3">
                                {/* Icon */}
                                <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.type === 'approval' ? 'bg-amber-100 text-amber-600' :
                                    notification.type === 'success' ? 'bg-green-100 text-green-600' :
                                        notification.type === 'warning' ? 'bg-orange-100 text-orange-600' :
                                            notification.type === 'error' ? 'bg-red-100 text-red-600' :
                                                'bg-blue-100 text-blue-600'
                                    }`}>
                                    {getIcon(notification.type)}
                                </div>

                                {/* Content */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2 mb-1">
                                        <p className="text-sm font-semibold text-gray-900 leading-tight group-hover:text-blue-600 transition-colors">
                                            {notification.title}
                                        </p>
                                        {!notification.read && (
                                            <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1"></div>
                                        )}
                                    </div>
                                    <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                        {notification.message}
                                    </p>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-400">
                                            {notification.timestamp}
                                        </span>
                                        {/* Arrow indicator on hover */}
                                        <svg className="w-4 h-4 text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Footer */}
            {
                notifications.length > 0 && (
                    <div className="p-2 border-t border-gray-200 bg-gray-50">
                        <button
                            onClick={() => {
                                navigate('/notifications');
                                onClose();
                            }}
                            className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            View all notifications
                        </button>
                    </div>
                )
            }
        </div >
    );
};
