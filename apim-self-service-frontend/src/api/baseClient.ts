import axios from 'axios';
import toast from 'react-hot-toast';
import { API_CONFIG } from '../config/env';

/**
 * Base API instance for the shell and all features.
 */
export const api = axios.create({
    baseURL: API_CONFIG.BASE_URL,
    headers: { 'Content-Type': 'application/json' },
});

// Global Error Handling Interceptor
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (!error.response) {
            toast.error('The backend service seems to be offline.', { id: 'backend-offline' });
        } else if (error.response.status >= 500) {
            toast.error('The backend is experiencing some issues.', { id: 'backend-error' });
        }
        return Promise.reject(error);
    }
);

/**
 * Shared instance for Workflow/Drafts (if separate).
 */
export const workflowApi = axios.create({
    baseURL: API_CONFIG.WORKFLOW_URL,
    headers: { 'Content-Type': 'application/json' },
});
