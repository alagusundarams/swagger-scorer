/**
 * Date & Time Utilities
 * 
 * Standardized formatting and calculation logic for dates.
 */

/**
 * Calculates days remaining until a specific date.
 */
export const getDaysUntil = (dateString: string): number => {
    const targetDate = new Date(dateString);
    const now = new Date();
    return Math.ceil((targetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Formats a date string to a standard readable format.
 */
export const formatReadableDate = (dateString: string): string => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    });
};

/**
 * Formats a date for a compact view.
 */
export const formatCompactDate = (dateString: string): string => {
    if (!dateString) return '---';
    return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};
