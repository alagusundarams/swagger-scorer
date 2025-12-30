/**
 * Event Type Definitions
 * 
 * This file defines all events that can be used for cross-feature communication.
 * Each event has a strongly-typed payload to ensure type safety.
 * 
 * @architecture
 * - All events follow the pattern: `feature:action`
 * - Event names are lowercase with colons separating namespace and action
 * - Payloads are fully typed interfaces
 * 
 * @example Adding a New Event
 * ```typescript
 * // 1. Define the payload interface with JSDoc
 * export interface MyFeatureChangedPayload {
 *   featureId: string;
 *   action: 'created' | 'updated' | 'deleted';
 * }
 * 
 * // 2. Add to EventPayloadMap
 * export interface EventPayloadMap {
 *   'myfeature:changed': MyFeatureChangedPayload;
 * }
 * 
 * // 3. Use it in your feature
 * eventBus.emit('myfeature:changed', { featureId: '123', action: 'created' });
 * ```
 */

import type { Team, Product, Environment, ApprovalRequest } from '../types/domain';

/**
 * Team Events
 */

/**
 * Payload for team creation event
 * Emitted when a new team is created in the system
 * 
 * @subscribers
 * - inventory: Refresh team dropdowns in product management
 * - admin: Update team listing views
 */
export interface TeamCreatedPayload {
    /** The newly created team */
    team: Team;
}

/**
 * Payload for team update event
 * Emitted when team details are modified
 * 
 * @subscribers
 * - inventory: Refresh cached team data
 * - admin: Update team displays
 */
export interface TeamUpdatedPayload {
    /** ID of the updated team */
    teamId: string;
    /** The updated team object */
    team: Team;
}

/**
 * Payload for team deletion event
 * Emitted when a team is removed from the system
 * 
 * @subscribers
 * - inventory: Remove team from dropdowns
 * - admin: Update orphaned product warnings
 */
export interface TeamDeletedPayload {
    /** ID of the deleted team */
    teamId: string;
}

/**
 * Product Events
 */

/**
 * Payload for product creation event
 * Emitted when a new product is registered
 * 
 * @subscribers
 * - admin: Update global inventory view
 * - governance: Initialize approval workflows
 */
export interface ProductCreatedPayload {
    /** The newly created product */
    product: Product;
}

/**
 * Payload for product update event
 * Emitted when product metadata changes
 * 
 * @subscribers
 * - inventory: Refresh product views
 * - governance: Update approval requests if needed
 */
export interface ProductUpdatedPayload {
    /** ID of the updated product */
    productId: string;
    /** The updated product object */
    product: Product;
}

/**
 * Payload for product promotion event
 * Emitted when a product is promoted to a new environment
 * 
 * @subscribers
 * - governance: Create or update approval records
 * - inventory: Refresh product status displays
 */
export interface ProductPromotedPayload {
    /** ID of the promoted product */
    productId: string;
    /** Source environment */
    fromEnvironment: Environment;
    /** Target environment */
    toEnvironment: Environment;
    /** The updated product */
    product: Product;
}

/**
 * Governance Events
 */

/**
 * Payload for approval request creation
 * Emitted when a new approval request is created
 * 
 * @subscribers
 * - inventory: Show pending approval badges
 * - admin: Update approval queue
 */
export interface ApprovalRequestCreatedPayload {
    /** The newly created approval request */
    approvalRequest: ApprovalRequest;
}

/**
 * Payload for approval processing event
 * Emitted when an approval request is approved or rejected
 * 
 * @subscribers
 * - inventory: Update product promotion status
 * - governance: Update approval request status
 */
export interface ApprovalProcessedPayload {
    /** ID of the approval request */
    requestId: string;
    /** Whether the request was approved */
    approved: boolean;
    /** Optional rejection reason */
    reason?: string;
}

/**
 * Data Refresh Events
 */

/**
 * Payload for requesting data refresh
 * Emitted when a feature needs other features to refresh their data
 * 
 * @subscribers
 * - All features: Re-fetch their data if applicable
 */
export interface DataRefreshRequestedPayload {
    /** Type of data that should be refreshed */
    dataType: 'teams' | 'products' | 'approvals' | 'all';
    /** Optional: specific IDs to refresh */
    ids?: string[];
}

/**
 * Event Type to Payload Mapping
 * 
 * This interface maps event type strings to their payload types.
 * It's used by the EventBus to enforce type safety.
 */
export interface EventPayloadMap {
    // Team events
    'team:created': TeamCreatedPayload;
    'team:updated': TeamUpdatedPayload;
    'team:deleted': TeamDeletedPayload;

    // Product events
    'product:created': ProductCreatedPayload;
    'product:updated': ProductUpdatedPayload;
    'product:promoted': ProductPromotedPayload;

    // Governance events
    'approval:created': ApprovalRequestCreatedPayload;
    'approval:processed': ApprovalProcessedPayload;

    // Data refresh events
    'data:refresh': DataRefreshRequestedPayload;
}

/**
 * Union type of all event names
 * Used for type checking and autocomplete
 */
export type EventType = keyof EventPayloadMap;

/**
 * Helper type to get the payload type for a given event
 * 
 * @example
 * ```typescript
 * type TeamUpdatedPayload = EventPayload<'team:updated'>;
 * ```
 */
export type EventPayload<T extends EventType> = EventPayloadMap[T];
