/**
 * Event Bus Tests
 * 
 * Tests for the lightweight pub/sub event bus used for
 * cross-feature communication in the MFE architecture.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { eventBus, EventBus } from './eventBus';
import type { TeamCreatedPayload, TeamUpdatedPayload } from './eventTypes';

describe('EventBus', () => {
    let bus: EventBus;

    beforeEach(() => {
        bus = new EventBus();
    });

    afterEach(() => {
        bus.clearAll();
    });

    describe('subscribe and emit', () => {
        it('should emit events to subscribers', () => {
            const handler = vi.fn();
            const payload: TeamCreatedPayload = {
                team: {
                    id: 'team-1',
                    name: 'Test Team',
                    azureAdGroupId: 'ad-group-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            };

            bus.on('team:created', handler);
            bus.emit('team:created', payload);

            expect(handler).toHaveBeenCalledTimes(1);
            expect(handler).toHaveBeenCalledWith(payload);
        });

        it('should emit to multiple subscribers', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();
            const handler3 = vi.fn();
            const payload: TeamUpdatedPayload = {
                teamId: 'team-1',
                team: {
                    id: 'team-1',
                    name: 'Updated Team',
                    azureAdGroupId: 'ad-group-1',
                    type: 'producer',
                    description: 'Updated',
                    memberCount: 10,
                },
            };

            bus.on('team:updated', handler1);
            bus.on('team:updated', handler2);
            bus.on('team:updated', handler3);
            bus.emit('team:updated', payload);

            expect(handler1).toHaveBeenCalledWith(payload);
            expect(handler2).toHaveBeenCalledWith(payload);
            expect(handler3).toHaveBeenCalledWith(payload);
        });

        it('should not call handlers for different event types', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('team:created', handler1);
            bus.on('team:updated', handler2);

            bus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });

            expect(handler1).toHaveBeenCalledTimes(1);
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('unsubscribe', () => {
        it('should unsubscribe handlers', () => {
            const handler = vi.fn();

            const unsubscribe = bus.on('team:created', handler);
            unsubscribe();

            bus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });

            expect(handler).not.toHaveBeenCalled();
        });

        it('should clean up empty Sets after unsubscribe', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            const unsub1 = bus.on('team:created', handler1);
            const unsub2 = bus.on('team:created', handler2);

            unsub1();
            unsub2();

            // @ts-ignore - accessing private property for testing
            expect(bus.subscribers['team:created']).toBeUndefined();
        });

        it('should allow calling unsubscribe multiple times safely', () => {
            const handler = vi.fn();

            const unsubscribe = bus.on('team:created', handler);

            expect(() => {
                unsubscribe();
                unsubscribe();
                unsubscribe();
            }).not.toThrow();
        });
    });

    describe('error handling', () => {
        it('should catch errors in handlers and continue', () => {
            const errorHandler = vi.fn(() => {
                throw new Error('Handler error');
            });
            const successHandler = vi.fn();
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => { });

            bus.on('team:created', errorHandler);
            bus.on('team:created', successHandler);

            bus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });

            expect(errorHandler).toHaveBeenCalled();
            expect(successHandler).toHaveBeenCalled();
            expect(consoleErrorSpy).toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });
    });

    describe('clear methods', () => {
        it('should clear specific event type', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('team:created', handler1);
            bus.on('team:updated', handler2);

            bus.clear('team:created');

            bus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });
            bus.emit('team:updated', {
                teamId: 'team-1',
                team: {
                    id: 'team-1',
                    name: 'Updated',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Updated',
                    memberCount: 10,
                },
            });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).toHaveBeenCalled();
        });

        it('should clear all event types', () => {
            const handler1 = vi.fn();
            const handler2 = vi.fn();

            bus.on('team:created', handler1);
            bus.on('team:updated', handler2);

            bus.clearAll();

            bus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });
            bus.emit('team:updated', {
                teamId: 'team-1',
                team: {
                    id: 'team-1',
                    name: 'Updated',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Updated',
                    memberCount: 10,
                },
            });

            expect(handler1).not.toHaveBeenCalled();
            expect(handler2).not.toHaveBeenCalled();
        });
    });

    describe('singleton instance', () => {
        it('should use shared singleton instance', () => {
            const handler = vi.fn();

            eventBus.on('team:created', handler);
            eventBus.emit('team:created', {
                team: {
                    id: 'team-1',
                    name: 'Test',
                    azureAdGroupId: 'ad-1',
                    type: 'producer',
                    description: 'Test',
                    memberCount: 5,
                },
            });

            expect(handler).toHaveBeenCalled();

            eventBus.clearAll();
        });
    });
});
