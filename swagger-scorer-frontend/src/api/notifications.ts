// Notification API service - Placeholder for backend calls

export const notificationApi = {
    /**
     * Mark a single notification as read
     * @param notificationId - ID of the notification to mark as read
     * @returns Promise that resolves when the request completes
     */
    async markAsRead(notificationId: string): Promise<void> {
        // TODO: Replace with actual API call
        // Example: await fetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
        console.log(`[API PLACEHOLDER] Marking notification ${notificationId} as read`);

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
    },

    /**
     * Mark all notifications as read for the current user
     * @returns Promise that resolves when the request completes
     */
    async markAllAsRead(): Promise<void> {
        // TODO: Replace with actual API call
        // Example: await fetch('/api/notifications/read-all', { method: 'PATCH' })
        console.log('[API PLACEHOLDER] Marking all notifications as read');

        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 100));
    },

    /**
     * Fetch notifications for the current user
     * @returns Promise that resolves with notifications array
     */
    async fetchNotifications(): Promise<any[]> {
        // Mock Data for Navigational Triggers
        return [
            {
                id: 'notif-001',
                type: 'approval',
                title: 'New API Access Request',
                message: 'Team Checkout requested access to Payment Gateway.',
                timestamp: 'Just now',
                read: false,
                navigateTo: '/dashboard?tab=approvals' // DIRECT NAVIGATION
            },
            {
                id: 'notif-002',
                type: 'success',
                title: 'Subscription Approved',
                message: 'Your access to Identity Service PROD is now active.',
                timestamp: '2 hours ago',
                read: false,
                navigateTo: '/products/prod-002' // Contextual Navigation
            },
            {
                id: 'notif-003',
                type: 'warning',
                title: 'High Latency Alert',
                message: 'Payment Gateway is experiencing 500ms+ latency.',
                timestamp: '5 hours ago',
                read: true,
                navigateTo: '/products/prod-001'
            }
        ];
    }
};
