/**
 * Event Bus - Cross-Feature Communication System
 * 
 * This event bus enables features to communicate without direct dependencies,
 * maintaining strict Micro-Frontend (MFE) boundaries.
 * 
 * @example Basic Usage
 * ```typescript
 * // Feature A emits an event
 * eventBus.emit('team:updated', { teamId: '123', team: updatedTeam });
 * 
 * // Feature B subscribes to the event
 * const unsubscribe = eventBus.on('team:updated', (payload) => {
 *   console.log('Team updated:', payload.team);
 * });
 * 
 * // Clean up when component unmounts
 * unsubscribe();
 * ```
 * 
 * @example React Hook Usage
 * ```typescript
 * function MyComponent() {
 *   useEffect(() => {
 *     const unsubscribe = eventBus.on('product:created', (payload) => {
 *       // Handle product creation
 *     });
 *     return () => unsubscribe();
 *   }, []);
 * }
 * ```
 * 
 * @architecture
 * - **Singleton Pattern**: One instance shared across the app
 * - **Type-Safe**: All events are strongly typed via TypeScript
 * - **Decoupled**: Publishers don't know about subscribers
 * - **Memory Safe**: Automatic cleanup via unsubscribe functions
 */

import type { EventPayload, EventType } from './eventTypes';

/**
 * Event handler function signature
 */
type EventHandler<T extends EventType> = (payload: EventPayload<T>) => void;

/**
 * Event subscription storage
 */
type EventSubscribers = {
    [K in EventType]?: Set<EventHandler<K>>;
};

/**
 * EventBus class - Manages pub/sub for cross-feature communication
 */
class EventBus {
    /**
     * Internal storage for event subscribers
     * Uses Sets to prevent duplicate subscriptions
     */
    private subscribers: EventSubscribers = {};

    /**
     * Subscribe to an event
     * 
     * @param eventType - The type of event to listen for
     * @param handler - Function to call when event is emitted
     * @returns Unsubscribe function to clean up the subscription
     * 
     * @example
     * ```typescript
     * const unsubscribe = eventBus.on('team:updated', (payload) => {
     *   console.log('Team changed:', payload.teamId);
     * });
     * // Later, when done:
     * unsubscribe();
     * ```
     */
    on<T extends EventType>(
        eventType: T,
        handler: EventHandler<T>
    ): () => void {
        // Initialize the Set if this is the first subscriber for this event
        if (!this.subscribers[eventType]) {
            this.subscribers[eventType] = new Set();
        }

        // Add the handler to the subscribers
        const handlers = this.subscribers[eventType] as Set<EventHandler<T>>;
        handlers.add(handler);

        // Return unsubscribe function for cleanup
        return () => {
            handlers.delete(handler);

            // Clean up empty Sets to prevent memory leaks
            if (handlers.size === 0) {
                delete this.subscribers[eventType];
            }
        };
    }

    /**
     * Emit an event to all subscribers
     * 
     * @param eventType - The type of event to emit
     * @param payload - Data to send to subscribers
     * 
     * @example
     * ```typescript
     * eventBus.emit('product:promoted', {
     *   productId: 'prod-123',
     *   fromEnvironment: 'dev',
     *   toEnvironment: 'qa'
     * });
     * ```
     */
    emit<T extends EventType>(
        eventType: T,
        payload: EventPayload<T>
    ): void {
        const handlers = this.subscribers[eventType];

        if (!handlers || handlers.size === 0) {
            // No subscribers - this is normal and expected
            return;
        }

        // Call each subscriber with the payload
        handlers.forEach((handler) => {
            try {
                handler(payload);
            } catch (error) {
                // Prevent one subscriber's error from affecting others
                console.error(`Error in event handler for ${eventType}:`, error);
            }
        });
    }

    /**
     * Remove all subscribers for a specific event type
     * Useful for testing or feature cleanup
     * 
     * @param eventType - The event type to clear
     */
    clear(eventType: EventType): void {
        delete this.subscribers[eventType];
    }

    /**
     * Remove all subscribers for all events
     * Use with caution - typically only needed for testing
     */
    clearAll(): void {
        this.subscribers = {};
    }
}

/**
 * Singleton instance - use this throughout your app
 * 
 * @example
 * ```typescript
 * import { eventBus } from '@/shared/events/eventBus';
 * 
 * eventBus.emit('team:created', { teamId: '123', team: newTeam });
 * ```
 */
export const eventBus = new EventBus();

/**
 * Export the class for testing purposes
 */
export { EventBus };
