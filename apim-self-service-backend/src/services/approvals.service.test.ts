import { describe, it, beforeEach, vi, expect } from 'vitest';

// 1. Hoist ALL mocks
const { mockDb, mockAudit, mockPromotion, mockRepoService, mockSnow, mockGit, mockApim } = vi.hoisted(() => {
    return {
        mockDb: {
            query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        },
        mockAudit: {
            logAudit: vi.fn().mockResolvedValue({})
        },
        mockPromotion: {
            autoPromoteProduct: vi.fn().mockResolvedValue({ success: true, deploymentId: 'dep-123' })
        },
        mockRepoService: {
            validateRepoUrl: vi.fn().mockResolvedValue({ isValid: true }),
            getCommitMetadata: vi.fn().mockResolvedValue({ hash: 'h1' }),
            commitFiles: vi.fn().mockResolvedValue({})
        },
        mockSnow: {
            createSNOWTicket: vi.fn().mockResolvedValue({ ticketId: 'tick-1' })
        },
        mockGit: {
            simulateDeployCommit: vi.fn().mockResolvedValue({ hash: 'ghash', branch: 'main' })
        },
        mockApim: {
            syncToAPIM: vi.fn().mockResolvedValue({})
        }
    };
});

// 2. Map mocks
vi.mock('./db.js', () => mockDb);
vi.mock('./audit.service.js', () => mockAudit);
vi.mock('./promotion.service.js', () => mockPromotion);
vi.mock('./snow.service.js', () => mockSnow);
vi.mock('./ado/RepoService.js', () => ({
    RepoService: vi.fn().mockImplementation(() => mockRepoService)
}));
vi.mock('./git.service.js', () => mockGit);
vi.mock('./apim.service.js', () => mockApim);

// 3. Import service
import * as approvalsService from './approvals.service.js';

describe('Approvals Service Corrected', () => {
    const mockQueryResult = (rows: any[] = []): any => ({
        rows,
        command: 'SELECT',
        rowCount: rows.length,
        oid: 0,
        fields: []
    });

    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ENABLE_STRICT_VALIDATION = 'true';
    });

    it('should cover the legacy DEV flow and validation gates', async () => {
        // Setup approval for DEV
        mockDb.query.mockResolvedValueOnce(mockQueryResult([{
            id: 'app-123',
            type: 'SUBSCRIPTION',
            status: 'PENDING',
            details: { environment: 'DEV', productId: 'p1', repoUrl: 'https://repo.com' }
        }]));

        // Mock the update and subscription update
        mockDb.query.mockResolvedValue(mockQueryResult([{ id: 'app-123', type: 'SUBSCRIPTION', details: { environment: 'DEV', productId: 'p1', repoUrl: 'https://repo.com' } }]));

        await approvalsService.updateApproval('app-123', 'APPROVED', 'user-1');

        expect(mockAudit.logAudit).toHaveBeenCalled();
        expect(mockSnow.createSNOWTicket).toHaveBeenCalled();
    });

    it('should handle auto-promotion failure path', async () => {
        // Setup approval for PROMOTION
        mockDb.query.mockResolvedValueOnce(mockQueryResult([{
            id: 'app-456',
            type: 'PROMOTION',
            status: 'PENDING',
            details: { productId: 'p1', targetEnvironment: 'QA', sourceHash: 'h1' }
        }]));

        // Mock the update
        mockDb.query.mockResolvedValue(mockQueryResult([{
            id: 'app-456',
            type: 'PROMOTION',
            details: { productId: 'p1', targetEnvironment: 'QA', sourceHash: 'h1' }
        }]));

        // Mock promotion failure
        mockPromotion.autoPromoteProduct.mockResolvedValueOnce({ success: false, error: 'Promo Error' });

        await approvalsService.updateApproval('app-456', 'APPROVED', 'user-1');

        expect(mockAudit.logAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'auto_promotion_failed'
        }));
    });

    it('should throw on validation gate failure', async () => {
        mockDb.query.mockResolvedValue(mockQueryResult([{
            id: 'app-789',
            type: 'SUBSCRIPTION',
            details: { environment: 'DEV', productId: 'p1', repoUrl: 'https://invalid.com' }
        }]));

        mockRepoService.validateRepoUrl.mockResolvedValueOnce({ isValid: false, error: 'BAD_URL' });

        await expect(approvalsService.updateApproval('app-789', 'APPROVED', 'user-1'))
            .rejects.toThrow('VALIDATION GATE FAILURE');
    });

    it('should reject an approval', async () => {
        mockDb.query.mockResolvedValue(mockQueryResult([{ id: 'app-1', status: 'REJECTED', type: 'SUBSCRIPTION', details: {} }]));

        await approvalsService.updateApproval('app-1', 'REJECTED', 'user-1');
        expect(mockDb.query).toHaveBeenCalledWith(expect.stringMatching(/UPDATE\s+approval_requests\s+SET\s+status\s*=\s*\$1/), ['REJECTED', 'user-1', 'app-1']);
    });
});
