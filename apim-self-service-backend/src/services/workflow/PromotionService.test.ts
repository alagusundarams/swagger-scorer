import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as promotionService from './PromotionService.js';
import { query } from '../core/db.js';
import { deployProductToEnvironment } from '../apim/SdkArmService.js';
import { auditService } from '../core/AuditService.js';

// Mock dependencies
vi.mock('../core/db.js', () => ({
    query: vi.fn()
}));

vi.mock('../core/AuditService.js', () => ({
    auditService: {
        log: vi.fn().mockResolvedValue('audit-123'),
        queryLogs: vi.fn().mockResolvedValue([])
    }
}));

vi.mock('../apim/SdkArmService.js', () => ({
    deployProductToEnvironment: vi.fn(() => Promise.resolve({ success: true, deploymentId: 'arm-123' }))
}));

vi.mock('./OverlayService.js', () => ({
    OverlayService: vi.fn().mockImplementation(() => ({
        mergePolicy: vi.fn().mockResolvedValue({ finalXml: '<merged />' })
    }))
}));

describe('Promotion Service', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should block auto-promotion to PROD', async () => {
        const result = await promotionService.autoPromoteProduct('appr-1', 'prod-1', 'PROD', 'hash', 'user');

        expect(result.success).toBe(false);
        expect(result.error).toBe('PROD requires manual promotion flow');
    });

    it('should auto-promote to QA successfully', async () => {
        // Mock product fetch
        (query as any).mockResolvedValueOnce({
            rows: [{ display_name: 'API', description: 'Desc', api_path: '/api', policy_xml: '<xml />' }]
        });
        // Mock DB updates (hash update and audit log)
        (query as any).mockResolvedValue({ rows: [] });

        const result = await promotionService.autoPromoteProduct('appr-1', 'prod-1', 'QA', 'hash-123', 'admin-user');

        expect(result.success).toBe(true);
        expect(deployProductToEnvironment).toHaveBeenCalledWith(
            'prod-1',
            'QA',
            expect.objectContaining({ apiPath: '/api' })
        );
        // Verify update was called
        expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE products'), expect.arrayContaining(['hash-123', 'prod-1']));
        // Verify update was called
        expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE products'), expect.arrayContaining(['hash-123', 'prod-1']));
        // Verify audit log was called via AuditService
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'PROMOTE',
            resourceType: 'product',
            resourceId: 'prod-1'
        }));
    });

    it('should handle deployment failure in auto-promotion', async () => {
        (query as any).mockResolvedValueOnce({
            rows: [{ display_name: 'API', description: 'Desc', api_path: '/api', policy_xml: '<xml />' }]
        });
        (deployProductToEnvironment as any).mockResolvedValueOnce({ success: false, error: 'ARM Error' });
        (query as any).mockResolvedValue({ rows: [] }); // Audit log

        const result = await promotionService.autoPromoteProduct('appr-1', 'prod-1', 'QA', 'hash', 'user');

        expect(result.success).toBe(false);
        expect(result.error).toBe('ARM Error');
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'PROMOTE',
            details: expect.objectContaining({
                status: 'failed',
                error: 'ARM Error'
            })
        }));
    });

    it('should perform manual promotion correctly', async () => {
        (query as any).mockResolvedValueOnce({
            rows: [{ display_name: 'API', description: 'Desc', api_path: '/api', policy_xml: '<xml />', dev_hash: 'dev-hash' }]
        });
        (query as any).mockResolvedValue({ rows: [] });

        const result = await promotionService.promoteProduct('prod-1', 'STAGE', 'user-1');

        expect(result.success).toBe(true);
        expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE products'), expect.arrayContaining(['dev-hash', 'prod-1']));
        expect(auditService.log).toHaveBeenCalledWith(expect.objectContaining({
            action: 'PROMOTE',
            resourceId: 'prod-1'
        }));
    });

    it('should fetch promotion history', async () => {
        const mockHistory = [
            { timestamp: '2024-01-01', action: 'PROMOTE', userId: 'user-1', details: { targetEnvironment: 'QA' } }
        ];
        (auditService.queryLogs as any).mockResolvedValueOnce(mockHistory);

        const history = await promotionService.getPromotionHistory('prod-1');

        expect(history).toHaveLength(1);
        expect(history[0].action).toBe('PROMOTE');
        // The service now returns the raw log entries from queryLogs
        expect(history[0].details.targetEnvironment).toBe('QA');
    });
});
