import { describe, it, beforeEach, vi, expect } from 'vitest';

// 1. Mock DB
const { mockDb } = vi.hoisted(() => ({
    mockDb: { query: vi.fn() }
}));
vi.mock('./db.js', () => mockDb);

// 2. Import service
import * as auditService from './audit.service.js';

describe('Audit Service', () => {
    const mockQueryResult = (rows: any[] = []): any => ({
        rows,
        command: 'SELECT',
        rowCount: rows.length,
        oid: 0,
        fields: []
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should log audit entries', async () => {
        mockDb.query.mockResolvedValueOnce(mockQueryResult([]));
        await auditService.logAudit({
            entityType: 'T', entityId: 'I', action: 'A', userId: 'U', changes: { f: 't' }
        });
        expect(mockDb.query).toHaveBeenCalled();
    });

    it('should fetch audit logs without filter', async () => {
        mockDb.query.mockResolvedValueOnce(mockQueryResult([
            { id: 1, entity_type: 'T', entity_id: 'I', action: 'A', user_id: 'U', user_name: 'User', changes: {}, timestamp: new Date() }
        ]));
        const logs = await auditService.getAuditLogs();
        expect(logs.length).toBe(1);
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('ORDER BY l.timestamp DESC'), []);
    });

    it('should fetch audit logs with entity filter', async () => {
        mockDb.query.mockResolvedValueOnce(mockQueryResult([
            { id: 1, entity_type: 'T', entity_id: 'I', action: 'A', user_id: 'U', user_name: 'User', changes: {}, timestamp: new Date() }
        ]));
        const logs = await auditService.getAuditLogs('I');
        expect(logs.length).toBe(1);
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('WHERE entity_id = $1'), ['I']);
    });
});
