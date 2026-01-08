import axios from 'axios';
import toast from 'react-hot-toast';
import { APP_CONFIG } from '../config/appConfig';

/**
 * Base API instance for the shell and all features.
 */
export const api = axios.create({
    baseURL: APP_CONFIG.api.baseUrl,
    headers: { 'Content-Type': 'application/json' },
});

/**
 * WAF Hardening Interceptor: Transmit all POST/PUT/PATCH data in Base64
 * to bypass enterprise WAF anomaly detection.
 */
api.interceptors.request.use((config) => {
    const methodsToEncode = ['post', 'put', 'patch'];
    if (methodsToEncode.includes(config.method?.toLowerCase() || '') && config.data) {
        // Only encode if not already encoded
        if (typeof config.data === 'object' && !config.data._v) {
            const jsonString = JSON.stringify(config.data);
            // Encode to Base64 (Unicode safe)
            const encoded = btoa(unescape(encodeURI(jsonString)));

            config.data = { _v: encoded };
            config.headers['X-Safe-Transport'] = 'base64';
        }
    }
    return config;
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
    baseURL: APP_CONFIG.api.workflowUrl,
    headers: { 'Content-Type': 'application/json' },
});
