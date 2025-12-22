
/**
 * transportUtils
 * 
 * Provides safe encoding/decoding for WAF-sensitive payloads.
 * Uses Base64 to bypass WAF anomaly detection and includes size checks.
 */

/**
 * Encodes a string (e.g. XML) to Base64 for safe transport.
 * Supports Unicode/UTF-8 strings.
 */
export const encodeForTransport = (content: string): string => {
    // btoa alone doesn't support unicode. This is the common workaround.
    return btoa(unescape(encodeURIComponent(content)));
};

/**
 * Checks if a string payload exceeds a specific size in MB.
 */
export const checkPayloadSize = (content: string, limitMB: number = 2): { isTooLarge: boolean; sizeMB: number } => {
    const bytes = new Blob([content]).size;
    const mb = bytes / (1024 * 1024);
    return {
        isTooLarge: mb > limitMB,
        sizeMB: mb
    };
};

/**
 * Prepares a payload for WAF-safe POST.
 * Returns the encoded content and metadata about the transfer.
 */
export const prepareSafePayload = (content: string) => {
    const encoded = encodeForTransport(content);
    const size = checkPayloadSize(encoded);

    return {
        encoded,
        ...size,
        encoding: 'base64'
    };
};
