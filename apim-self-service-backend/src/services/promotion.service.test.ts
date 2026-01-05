import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as promotionService from './promotion.service.js';
import { query } from './db.js';
import { deployProductToEnvironment } from './arm.service.js';

// Mock dependencies
vi.mock('./db.js', () => ({
    query: vi.fn()
}));

vi.mock('./arm.service.js', () => ({
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
        // Verify audit log was called
        expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.arrayContaining(['auto_promotion']));
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
        expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.arrayContaining(['auto_promotion_failed']));
    });

    it('should perform manual promotion correctly', async () => {
        (query as any).mockResolvedValueOnce({
            rows: [{ display_name: 'API', description: 'Desc', api_path: '/api', policy_xml: '<xml />', dev_hash: 'dev-hash' }]
        });
        (query as any).mockResolvedValue({ rows: [] });

        const result = await promotionService.promoteProduct('prod-1', 'STAGE', 'user-1');

        expect(result.success).toBe(true);
        expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE products'), expect.arrayContaining(['dev-hash', 'prod-1']));
        expect(query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO audit_log'), expect.arrayContaining(['manual_promotion']));
    });

    it('should fetch promotion history', async () => {
        const mockHistory = [
            { timestamp: '2024-01-01', action: 'auto_promotion', user_id: 'user-1', changes: { targetEnvironment: 'QA' } }
        ];
        (query as any).mockResolvedValueOnce({ rows: mockHistory });

        const history = await promotionService.getPromotionHistory('prod-1');

        expect(history).toHaveLength(1);
        expect(history[0].action).toBe('auto_promotion');
        expect(history[0].environment).toBe('QA');
    });
});
