/**
 * @fileoverview Authentication Middleware
 * 
 * Extracts user ID from request headers (mock auth for now)
 * In production: Replace with real JWT/session validation
 */

import { FastifyRequest } from 'fastify';

/**
 * Get authenticated user ID from request
 * 
 * For now: Reads from X-User-Id header (mock auth)
 * TODO: Replace with real JWT extraction in production
 */
export function getUserId(request: FastifyRequest): string {
    // Mock auth: Read from header
    const userId = request.headers['x-user-id'] as string;

    if (!userId) {
        throw new Error('Unauthorized: No user ID provided. Set X-User-Id header.');
    }

    return userId;
}

/**
 * Get authenticated user with team context
 */
export function getUserContext(request: FastifyRequest): {
    userId: string;
    teamId?: string;
} {
    const userId = getUserId(request);
    const teamId = request.headers['x-team-id'] as string | undefined;

    return { userId, teamId };
}
