/**
 * Security Utilities
 * 
 * Centralized logic for sensitive data handling.
 */

/**
 * Standardized masking for sensitive keys/secrets.
 * Shows first 4 and last 4 characters, with 8 bullets in between.
 */
export const maskKey = (key: string): string => {
    if (!key || key.length < 8) return '••••••••';
    return `${key.substring(0, 4)}••••••••${key.substring(key.length - 4)}`;
};
