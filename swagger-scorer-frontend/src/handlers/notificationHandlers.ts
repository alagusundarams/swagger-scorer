import { useStore } from '../store/useStore';
import { notificationApi } from '../api/notifications';

/**
 * Isolated handler for marking a single notification as read
 * Testable and calls backend API
 */
export async function handleMarkNotificationAsRead(notificationId: string) {
    try {
        // Call backend API
        await notificationApi.markAsRead(notificationId);

        // Update local state only after successful API call
        useStore.getState().markNotificationAsRead(notificationId);
    } catch (error) {
        console.error('Failed to mark notification as read:', error);
        // TODO: Show error toast to user
    }
}

/**
 * Isolated handler for marking all notifications as read
 * Testable and calls backend API
 */
export async function handleMarkAllNotificationsAsRead() {
    try {
        // Call backend API
        await notificationApi.markAllAsRead();

        // Update local state only after successful API call
        useStore.getState().markAllNotificationsAsRead();
    } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
        // TODO: Show error toast to user
    }
}

/**
 * Isolated handler for notification click
 * Marks as read and navigates if needed
 */
export async function handleNotificationClick(
    notificationId: string,
    navigateTo?: string,
    navigate?: (path: string) => void
) {
    // Mark as read
    await handleMarkNotificationAsRead(notificationId);

    // Navigate if path provided
    if (navigateTo && navigate) {
        navigate(navigateTo);
    }
}
