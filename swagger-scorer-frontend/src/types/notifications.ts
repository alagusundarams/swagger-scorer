// Notification types and interfaces

export type NotificationType = 'approval' | 'success' | 'warning' | 'info' | 'error';

export interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    read: boolean;
    navigateTo: string; // URL to navigate to (e.g., "/approvals", "/products/abc")
}

export interface GlobalError {
    id: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    dismissible: boolean;
    source?: string; // Which microfrontend
}
