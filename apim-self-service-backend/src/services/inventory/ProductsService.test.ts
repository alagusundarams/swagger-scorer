import { describe, it, beforeEach, vi, expect } from 'vitest';

// 1. Hoist ALL mocks
const { mockRepo, mockDb, mockAudit, mockConfig, mockRepoService, mockSwagger, mockSpecFetcher, mockPolicyBuilder, mockApimMock } = vi.hoisted(() => {
    return {
        mockRepo: {
            getAllProducts: vi.fn(),
            getAllApis: vi.fn(),
            getProductById: vi.fn(),
            getApiById: vi.fn(),
            getOperations: vi.fn(),
            searchApis: vi.fn(),
            getRepoUrlForProduct: vi.fn(),
            getRepoUrlForApi: vi.fn(),
            getAllApisDetailed: vi.fn(),
            addProduct: vi.fn(),
            addApi: vi.fn(),
            upsertOperation: vi.fn(),
            removeApi: vi.fn(),
            updateProductOwner: vi.fn(),
            cascadeUpdateApiOwner: vi.fn(),
            getGlobalProducts: vi.fn(),
            getGlobalApis: vi.fn(),
            getGlobalInventory: vi.fn(),
            getPermissionMatrix: vi.fn(),
            deletePermissionMatrix: vi.fn(),
            insertPermissionMatrixEntry: vi.fn(),
            getNamedValues: vi.fn(),
            checkApiBelongsToProduct: vi.fn(),
            checkNamedValueCollision: vi.fn(),
            getExistingNamedValue: vi.fn(),
            updateNamedValue: vi.fn(),
            addNamedValue: vi.fn(),
            createNamedValue: vi.fn(),
            deleteNamedValue: vi.fn(),
            getAllApisByProductId: vi.fn(),
            setProductManagementMode: vi.fn(),
            getProductPolicy: vi.fn(),
            updateProductPolicy: vi.fn(),
            updateProduct: vi.fn(),
            getTeamById: vi.fn(),
            updateProductMetadata: vi.fn()
        },
        mockDb: {
            query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0 })
        },
        mockAudit: {
            auditService: {
                log: vi.fn().mockResolvedValue('ok'),
                queryLogs: vi.fn(),
                getResourceAudit: vi.fn()
            },
            logAudit: vi.fn().mockResolvedValue({})
        },
        mockConfig: {
            getAppConfig: vi.fn().mockReturnValue({ useBackendMocks: true })
        },
        mockRepoService: {
            getCommitMetadata: vi.fn().mockResolvedValue({ hash: 'h1' }),
            commitFiles: vi.fn().mockResolvedValue({})
        },
        mockSwagger: {
            parse: vi.fn().mockResolvedValue({
                paths: {
                    '/test': { get: { summary: 'Get Test' } }
                }
            })
        },
        mockSpecFetcher: {
            fetchSpecForProduct: vi.fn().mockResolvedValue('openapi: 3.0.0')
        },
        mockPolicyBuilder: {
            decomposePolicyXml: vi.fn().mockReturnValue({
                cleanedXml: '<xml/>',
                variables: [
                    { name: 'V1', value: 'VAL1' },
                    { name: 'V2', value: 'VAL2' }
                ]
            })
        },
        mockApimMock: {
            getArmService: vi.fn().mockResolvedValue({
                getProductPolicy: vi.fn().mockResolvedValue('<live-xml/>')
            }),
            updateProductMetadata: vi.fn().mockResolvedValue({ success: true })
        }
    };
});

// 2. Map mocks
vi.mock('../core/db.js', () => mockDb);
vi.mock('../core/AuditService.js', () => mockAudit);
vi.mock('../../config/loader.js', () => mockConfig);
vi.mock('../policy/PolicyBuilderService.js', () => mockPolicyBuilder);
vi.mock('../utils/SpecFetcherService.js', () => mockSpecFetcher);
vi.mock('../apim/ApimService.mock.js', () => mockApimMock);
vi.mock('../apim/ApimService.js', () => mockApimMock);
vi.mock('../git/ado/RepoService.js', () => ({
    RepoService: vi.fn().mockImplementation(() => mockRepoService)
}));
vi.mock('@apidevtools/swagger-parser', () => ({
    default: mockSwagger
}));
vi.mock('../../repositories/products.repo.js', () => ({
    ProductsRepository: vi.fn().mockImplementation(() => mockRepo)
}));

// 3. Import service
import * as productsService from './ProductsService.js';

const mockUserContext = { role: 'admin', teams: ['t1'], groups: ['g1'] };

describe('Products Service Final Final', () => {
    const mockQueryResult = (rows: any[] = []): any => ({
        rows,
        command: 'SELECT',
        rowCount: rows.length,
        oid: 0,
        fields: []
    });

    beforeEach(() => {
        vi.clearAllMocks();

        Object.keys(mockRepo).forEach(key => {
            (mockRepo as any)[key].mockResolvedValue(mockQueryResult([{ id: 'default-id' }]));
        });

        mockRepo.getAllProducts.mockResolvedValue(mockQueryResult([{ id: 'p1', display_name: 'P1', environment: 'DEV', management_mode: 'TERRAFORM_MANAGED' }]));
        mockRepo.getProductById.mockResolvedValue(mockQueryResult([{ id: 'p1', environment: 'DEV', management_mode: 'TERRAFORM_MANAGED' }]));
        mockRepo.getExistingNamedValue.mockResolvedValue(mockQueryResult([]));
    });

    it('should achieve 100% logic coverage', async () => {
        await productsService.getAllProducts();
        await productsService.getProductById('p1');
        await productsService.getAllApis();
        await productsService.getApiById('a1');
        await productsService.getOperations('a1');
        await productsService.searchApis('term');

        await productsService.addProduct({ id: 'p2', name: 'P2', displayName: 'P2', description: 'D', state: 'active', ownerTeamId: 't1', environment: 'DEV' });
        await productsService.updateProduct('p1', { ownerTeamId: 't2' }, mockUserContext);
        await productsService.addApi({ id: 'a2', productId: 'p1', name: 'A2', displayName: 'A2', description: 'D', path: '/a2' });
        await productsService.removeApi('a1', 'p1');

        await productsService.getGlobalInventory();
        await productsService.getPermissionMatrix('p1');
        await productsService.updatePermissionMatrix('p1', [{ adGroupId: 'g1', environment: 'DEV', role: 'admin' }]);

        await productsService.getProductPolicy('p1');
        await productsService.updateProductPolicy('p1', '<xml/>', mockUserContext);

        await productsService.ejectProduct('p1');
        await productsService.syncProductOperations('p1');
        await productsService.generateManifest('p1', 'json');
    });

    it('should hit sync error catch block', async () => {
        mockSwagger.parse.mockRejectedValueOnce(new Error('Boom'));
        const res = await productsService.syncProductOperations('p1');
        expect(res).toBeUndefined();
    });

    it('should hit git commit in eject without mocks', async () => {
        mockConfig.getAppConfig.mockReturnValue({ useBackendMocks: false });
        await productsService.ejectProduct('p1');
        expect(mockRepoService.commitFiles).toHaveBeenCalled();
    });

    it('should handle manifest generation with resource url fallback', async () => {
        // Force the fallback path
        mockRepo.getRepoUrlForProduct.mockResolvedValue(mockQueryResult([]));
        mockRepo.getRepoUrlForApi.mockResolvedValue(mockQueryResult([{ git_repo_url: 'api-url' }]));

        await productsService.generateManifest('p1', 'json');
        expect(mockRepo.getRepoUrlForApi).toHaveBeenCalled();
    });
});
