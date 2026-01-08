/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

// import { updateProductMetadata } from '../apim/ApimService.js';
// @ts-ignore
import SwaggerParser from '@apidevtools/swagger-parser';
import { auditService, logAudit } from '../core/AuditService.js';
import { decomposePolicyXml } from '../policy/PolicyBuilderService.js';
import { RepoService } from '../git/ado/RepoService.js';
import { getAppConfig } from '../../config/loader.js';
import { ProductsRepository } from '../../repositories/products.repo.js';
import { ApisRepository } from '../../repositories/apis.repo.js';
import { OperationsRepository } from '../../repositories/operations.repo.js';
import { TeamsRepository } from '../../repositories/teams.repo.js';
import { NamedValuesRepository } from '../../repositories/named-values.repo.js';
import { ResourceDiscovery, DiscoveryResult } from '../../utils/resourceDiscovery.js';
import { fetchSpecForProduct } from '../utils/SpecFetcherService.js';
import { createNamedValue } from './NamedValuesService.js';


const productsRepo = new ProductsRepository();
const apisRepo = new ApisRepository();
const operationsRepo = new OperationsRepository();
const teamsRepo = new TeamsRepository();
const namedValuesRepo = new NamedValuesRepository();

/**
 * Helper to get the APIM service (Mocked if requested)
 */
async function getApimService() {
    const config = getAppConfig();
    const isMock = config.useBackendMocks;
    if (isMock) {
        return await import('../apim/ApimService.mock.js');
    }
    return await import('../apim/ApimService.js');
}

/**
 * Fetch all products with their associated APIs and calculated subscriber counts
 * @param environment Optional environment filter (DEV, QA, STAGE, PROD)
 * @param userRole Optional user role (admin sees all, others see team-filtered)
 * @param teamId Optional team ID filter (ignored if userRole is 'admin')
 * @param userGroups Optional list of AD Group IDs the user belongs to
 * @param page Optional page number for pagination (1-indexed)
 * @param limit Optional number of items per page
 */
export async function getAllProducts(
    environment?: string,
    userRole: string = 'admin',
    teamId?: string,
    userGroups: string[] = [],
    page?: number,
    limit?: number
) {
    const usePagination = page !== undefined && limit !== undefined;

    // If pagination requested, use paginated query
    if (usePagination) {
        const offset = ((page || 1) - 1) * (limit || 20);
        const paginatedResult = await productsRepo.getAllProductsPaginated(
            environment, userRole, teamId, userGroups, limit!, offset
        );

        const productRes = paginatedResult;
        const total = paginatedResult.total;
        const apiRes = await apisRepo.getAllApis();

        // Assemble products with metadata
        const products = await assembleProducts(productRes.rows, apiRes.rows);

        return {
            products,
            pagination: {
                page: page || 1,
                limit: limit || 20,
                total,
                totalPages: Math.ceil(total / (limit || 20))
            }
        };
    }

    // Otherwise, use original non-paginated query (backward compatibility)
    const productRes = await productsRepo.getAllProducts(environment, userRole, teamId, userGroups);
    const apiRes = await apisRepo.getAllApis();

    const products = await assembleProducts(productRes.rows, apiRes.rows);

    return { products };
}

/**
 * Helper function to assemble product data with APIs and metadata
 */
async function assembleProducts(productRows: any[], apiRows: any[]) {
    const repoService = new RepoService();

    return await Promise.all(productRows.map(async (p: any) => {
        return {
            // Core fields
            id: p.id,
            name: p.name,
            displayName: p.display_name,
            version: p.version,
            description: p.description,
            state: p.state,
            type: p.type || 'standard',
            environment: p.environment,
            region: p.region,

            // Team ownership
            ownerTeamId: p.owner_team_id,
            ownerTeamName: p.owner_team_name,
            authorizedTeams: Array.isArray(p.authorized_teams) ? p.authorized_teams : [],

            // Metrics
            subscriberCount: p.calculated_subscriber_count,
            qualityScore: p.quality_score,

            // Management
            managementMode: p.management_mode,
            pipelineUrl: p.pipeline_url,
            gitRepoUrl: p.git_repo_url,
            lastDeployedCommitHash: p.last_deployed_commit_hash,
            lastDeployedAt: p.last_deployed_at,

            // Deployment Status
            isDeployed: !!p.last_deployed_commit_hash,

            // Identity (App Registration)
            identity: p.identity_client_id ? {
                clientId: p.identity_client_id,
                displayName: p.identity_display_name,
                appIdUri: p.identity_app_id_uri,
                type: (p.identity_type as 'PRODUCT' | 'API') || 'PRODUCT'
            } : undefined,

            // Timestamps
            createdAt: p.created_at,
            updatedAt: p.updated_at,

            // APIs
            apis: await Promise.all(apiRows
                .filter((a: any) => a.product_id === p.id)
                .map(async (a: any) => {
                    // Computed Status Calculation
                    // 1. Get latest commit for this API file
                    let statusDetails = 'Synced';
                    if (process.env.ENABLE_GIT_CHECKS === 'true' && a.git_repo_url && a.git_file_path) {
                        try {
                            const metadata = await repoService.getCommitMetadata(a.git_repo_url, a.git_file_path);
                            if (metadata && metadata.hash !== p.last_deployed_commit_hash) {
                                statusDetails = `Changed in ${p.environment} (Draft)`;
                            }
                        } catch (e) {
                            // Fallback/Ignore git errors to prevent listing failure
                        }
                    }

                    return {
                        id: a.id,
                        name: a.name,
                        displayName: a.display_name,
                        description: a.description,
                        path: a.path,
                        qualityScore: a.quality_score,
                        originTeamId: a.origin_team_id,
                        gitRepoUrl: a.git_repo_url,
                        gitFilePath: a.git_file_path,
                        operations: a.operations_json || [],
                        computedStatus: statusDetails,
                        identity: a.identity_client_id ? {
                            clientId: a.identity_client_id,
                            displayName: a.identity_display_name,
                            appIdUri: a.identity_app_id_uri,
                            type: (a.identity_type as 'PRODUCT' | 'API') || 'PRODUCT'
                        } : undefined
                    };
                }))
        };
    }));


}

/**
 * ACCESS LEVEL DEFINITIONS
 * - NONE: No access
 * - READ: Consumer access (View Product, View Own Subscriptions)
 * - WRITE: Producer access (Edit Policy, Edit Contract, View ALL Subscriptions)
 */
export type AccessLevel = 'NONE' | 'READ' | 'WRITE';

/**
 * Advanced RBAC: Calculate Access Level (Triple-Gate Logic)
 * 
 * Gate 1: Ownership/Authorization (Producer vs Consumer)
 * Gate 2: Environment Protection (AD Group enforcement for STAGE/PROD)
 * Gate 3: Deployment Check (Handled in getProductById)
 * 
 * Rules:
 * 1. Admin -> WRITE (Global)
 * 2. STAGE/PROD -> User MUST be in an AD group mapped to this product/env in permission_matrix.
 * 3. Default -> Based on Team Ownership or Authorized Teams.
 */
export async function calculateAccessLevel(product: any, user: { role?: string, teams?: string[], groups: string[] }, environment: string): Promise<AccessLevel> {
    const role = user.role || 'consumer';
    const teams = user.teams || [];
    const groups = user.groups || [];

    // 1. Admin Override
    if (role === 'admin') return 'WRITE';

    const isOwner = teams.includes(product.owner_team_id);

    // 2. Environment Protection (Gate 2)
    if (['STAGE', 'PROD'].includes(environment)) {
        const matrixRes = await productsRepo.getPermissionMatrix(product.id);
        const envRules = matrixRes.rows.filter((r: any) => r.environment === environment);

        if (envRules.length > 0) {
            const userInAuthorizedGroup = envRules.some((rule: any) => groups.includes(rule.ad_group_id));
            if (!userInAuthorizedGroup) {
                return 'NONE'; // Block access entirely if not in authorized AD group
            }

            // Determine if Producer or Consumer within this environment
            const hasWriteRule = envRules.some((rule: any) => groups.includes(rule.ad_group_id) && rule.role === 'PRODUCER');
            if (hasWriteRule || isOwner) return 'WRITE';
            return 'READ';
        } else {
            // Fallback to Owner Team's AD Group if matrix is empty
            const teamRes = await teamsRepo.getTeamById(product.owner_team_id);
            if (teamRes.rows.length > 0) {
                const ownerTeam = teamRes.rows[0];
                if (ownerTeam.azure_ad_group_id && !groups.includes(ownerTeam.azure_ad_group_id)) {
                    return 'NONE';
                }
            }
        }
    }

    // 3. Default (Gate 1)
    return isOwner ? 'WRITE' : 'READ';
}

/**
 * Fetch a single product by ID with environment context
 * Now supports Granular Dual-Role Access Level
 */
export async function getProductById(id: string, environment?: string, userContext: { role: string, teams: string[], groups: string[] } = { role: 'consumer', teams: [], groups: [] }) {
    const productRes = await productsRepo.getProductById(id);
    if (productRes.rows.length === 0) return null;
    const p = productRes.rows[0];

    // Instantiate Repo Service
    const repoService = new RepoService();

    // Fetch APIs for this product
    const apiRes = await apisRepo.getAllApisByProductId(id);

    // Determine effective environment for the view
    const effectiveEnv = environment || p.environment;

    // SECURITY: Calculate Access Level (Gate 2)
    const accessLevel = await calculateAccessLevel(p, userContext, effectiveEnv);

    // GATE 3: Deployment Check
    const isDeployed = !!p.last_deployed_commit_hash;

    // --- Strict Gating: Strip data if access is blocked ---
    if (accessLevel === 'NONE') {
        return {
            id: p.id,
            name: p.name,
            displayName: p.display_name,
            accessLevel,
            isDeployed,
            environment: effectiveEnv,
            region: p.region,
            ownerTeamName: p.owner_team_name,
            apis: [] // Blocked
        };
    }

    return {
        // Core fields
        id: p.id,
        name: p.name,
        displayName: p.display_name,
        version: p.version,
        description: p.description,
        state: p.state,
        type: p.type || 'standard',
        environment: effectiveEnv,
        region: p.region,

        // RBAC Meta
        accessLevel,
        isDeployed,

        // Team ownership
        ownerTeamId: p.owner_team_id,
        ownerTeamName: p.owner_team_name,
        authorizedTeams: Array.isArray(p.authorized_teams) ? p.authorized_teams : [],

        // Metrics
        subscriberCount: p.calculated_subscriber_count,
        qualityScore: p.quality_score,

        // Management
        managementMode: p.management_mode,
        pipelineUrl: p.pipeline_url,
        gitRepoUrl: p.git_repo_url,
        lastDeployedCommitHash: p.last_deployed_commit_hash,


        // Identity
        identity: p.identity_client_id ? {
            clientId: p.identity_client_id,
            displayName: p.identity_display_name,
            appIdUri: p.identity_app_id_uri,
            type: (p.identity_type as 'PRODUCT' | 'API') || 'PRODUCT'
        } : undefined,

        // Timestamps
        createdAt: p.created_at,
        updatedAt: p.updated_at,

        // APIs
        apis: await Promise.all(apiRes.rows.map(async (a: any) => {
            let statusDetails = 'Synced';
            if (process.env.ENABLE_GIT_CHECKS === 'true' && a.git_repo_url && a.git_file_path) {
                try {
                    const metadata = await repoService.getCommitMetadata(a.git_repo_url, a.git_file_path);
                    if (metadata && metadata.hash !== p.last_deployed_commit_hash) {
                        statusDetails = `Changed in ${effectiveEnv}`;
                    }
                } catch (e) {
                    // Ignore git errors
                }
            }

            return {
                id: a.id,
                name: a.name,
                displayName: a.display_name,
                description: a.description,
                path: a.path,
                qualityScore: a.quality_score,
                originTeamId: a.origin_team_id,
                gitRepoUrl: a.git_repo_url,
                gitFilePath: a.git_file_path,
                operations: a.operations_json || [],
                computedStatus: statusDetails,
                identity: a.identity_client_id ? {
                    clientId: a.identity_client_id,
                    displayName: a.identity_display_name,
                    appIdUri: a.identity_app_id_uri,
                    type: (a.identity_type as 'PRODUCT' | 'API') || 'PRODUCT'
                } : undefined
            };
        }))
    };
}

/**
 * Securely fetch Product Spec with RBAC (Environment Awareness)
 */
export async function getSecureProductSpec(productId: string, userGroups: string[]) {
    // 1. Fetch Product to determine Environment & Owner
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const product = productRes.rows[0];

    // 2. Validate Access (Strict for Stage/Prod)
    // We construct a partial user context since we only have groups here (Legacy sig)
    // Ideally we should pass full user. For now, strict 'groups' check via Access Level.
    const accessLevel = await calculateAccessLevel(product, { role: 'consumer', teams: [], groups: userGroups }, product.environment);

    // Spec Fetching requires WRITE access? Or at least READ?
    // If downgraded to READ (Consumer), can they see the full spec? Yes, Consumers need spec.
    // The previous check was "validateEnvironmentAccess" which was strict for Stage/Prod.
    // If accessLevel is 'READ' but we are in STAGE/PROD and they failed the AD Group check?
    // `calculateAccessLevel` returns 'READ' if they fail region check.
    // So if efficientEnv is STAGE/PROD, and they got READ, it means they are NOT in the AD Group.
    // Re-implementing strict check based on AccessLevel isn't direct.
    // Stuck with: If STAGE/PROD, we MUST be in AD Group.
    // `calculateAccessLevel` handles role downgrades.
    // We want to BLOCK if they are not allowed.

    // Wait, if they are downgraded to READ, does that mean they CAN access the spec?
    // Consumers CAN access specs (to subscribe).
    // The restriction was: "If targeting STAGE/PROD, user MUST be in the AD Group".
    // If they are NOT in the AD Group, they shouldn't even see the product in that env? 
    // Or they see it but can't edit?
    // The requirement was: "Granular Access... ensure users have appropriate read/write... Producers see all... Consumers see only their own."
    // And "Environment Aware": "If not in AD Group, blocked from that environment?"
    // AD Group usually implies "Producer Access" for that env.
    // If they are just a consumer, do they need AD Group? No.
    // So `READ` is fine for spec.

    // However, if we want strict gating (e.g. Private Env), `calculateAccessLevel` assumes Public Read.
    // Let's assume READ is sufficient for Spec.
    if (accessLevel === 'NONE') {
        throw new Error(`ACCESS_DENIED: User does not have access to ${product.environment} environment contracts.`);
    }

    // 3. Delegation (Discovery-Aware Spec Fetching)
    const config = getAppConfig();
    const isMock = config.useBackendMocks;

    if (isMock) {
        const { fetchSpecForProduct } = await import('../utils/SpecFetcherService.mock.js');
        return await fetchSpecForProduct(productId);
    }

    // Direct Discovery for Contracts
    const repoService = new RepoService();
    const fileList = await repoService.listRepoFiles(product.id, product.git_repo_url).catch(() => []);
    const contractPath = ResourceDiscovery.resolveContractPath(fileList, product.name, product.name);

    if (contractPath && product.git_repo_url) {
        const content = await repoService.getFileContent(product.id, product.git_repo_url, contractPath);
        if (content) return content;
    }

    // Fallback to SpecFetcherService
    const { fetchSpecForProduct: realFetch } = await import('../utils/SpecFetcherService.js');
    return await realFetch(productId);
}

/**
 * Helper to fetch the Git repository URL for a given resource (API or Product).
 * Since APIs are children of Products, we lookup via the parent product.
 */
export async function getRepoUrlForResource(resourceId: string): Promise<string | null> {
    // 1. Try if resourceId is a Product
    const productRes = await productsRepo.getRepoUrlForProduct(resourceId);
    if (productRes.rows[0]?.git_repo_url) {
        return productRes.rows[0].git_repo_url;
    }

    // 2. Try if resourceId is an API (lookup parent product)
    const apiRes = await apisRepo.getRepoUrlForApi(resourceId);

    return apiRes.rows[0]?.git_repo_url || null;
}

/**
 * Fetch all APIs with their parent product display names
 */
export async function getAllApis() {
    const res = await apisRepo.getAllApis(); // This query includes operations_json

    return res.rows.map((a: any) => ({
        ...a,
        productId: a.product_id,
        displayName: a.display_name,
        productDisplayName: a.product_display_name,
        qualityScore: a.quality_score,
        operations: a.operations_json || [] // Include operations!
    }));
}

export async function getApiById(id: string) {
    const res = await apisRepo.getApiById(id);
    if (res.rows.length === 0) return null;
    return res.rows[0];
}

/**
 * Fetch operations for a specific API
 */
export async function getOperations(apiId: string) {
    const res = await operationsRepo.getOperations(apiId);
    return res.rows.map((op: any) => ({
        id: op.id,
        apiId: op.api_id,
        method: op.method,
        urlTemplate: op.url_template,
        displayName: op.display_name,
        description: op.description
    }));
}

/**
 * Search APIs across all products
 */
export async function searchApis(queryTerm: string) {
    const res = await apisRepo.searchApis(queryTerm);

    return res.rows.map((a: any) => ({
        ...a,
        productId: a.product_id,
        displayName: a.display_name,
        productDisplayName: a.product_display_name
    }));
}

/**
 * Add a new product to the catalog
 */
export async function addProduct(product: {
    id: string,
    name: string,
    displayName: string,
    description: string,
    state: string,
    ownerTeamId: string,
    environment: string,
    type?: string,
    managementMode?: string,
    gitRepoUrl?: string
}) {
    const res = await productsRepo.addProduct(product);

    // Log Audit
    await auditService.log({
        resourceType: 'product',
        resourceId: product.id,
        action: 'CREATE',
        userId: product.ownerTeamId, // Assuming ownerTeamId is the user/team performing the action
        userEmail: 'unknown@example.com', // TODO: user context
        userRole: 'consumer',
        details: { name: product.name }
    });

    return res.rows[0];
}

/**
 * Add a new API to a product
 */
export async function addApi(api: {
    id: string,
    productId: string,
    name: string,
    displayName: string,
    description: string,
    path: string,
    qualityScore?: number,
    originTeamId?: string,
    gitRepoUrl?: string
}) {
    const res = await apisRepo.addApi(api);

    // Log Audit
    await logAudit({
        entityType: 'API',
        entityId: api.id,
        action: 'CREATE_API',
        userId: 'system-user',
        changes: api
    });

    return res.rows[0];
}

/**
 * Remove an API from a product
 */
export async function removeApi(apiId: string, productId: string) {
    const res = await apisRepo.removeApi(apiId, productId);

    if (res.rowCount === 0) {
        throw new Error('API not found or does not belong to this product');
    }

    // Log Audit
    await logAudit({
        entityType: 'API',
        entityId: apiId,
        action: 'DELETE_API',
        userId: 'system-user',
        changes: { productId }
    });

    return true;
}

/**
 * Update a product's metadata (e.g. ownership assignment)
 * @param id The product ID
 * @param data Partial product data
 */
export async function updateProduct(id: string, data: { ownerTeamId?: string }, userContext: { role: string, teams: string[], groups: string[] }) {
    if (!id) throw new Error('Product ID is required');

    // 1. Fetch current product to check type
    const productRes = await productsRepo.getProductById(id);
    if (productRes.rows.length === 0) throw new Error(`Product ${id} not found`);
    const product = productRes.rows[0];

    // 2. Validate Access (Must have WRITE access)
    // Note: If changing owner, do we check access to CURRENT owner or NEW owner?
    // Standard: Must have WRITE access to the product as it currently exists.
    const accessLevel = await calculateAccessLevel(product, userContext, product.environment);
    if (accessLevel !== 'WRITE') {
        throw new Error(`ACCESS_DENIED: You do not have permission to update this product.`);
    }

    // 3. Update the Product
    let result;
    if (data.ownerTeamId) {
        result = await productsRepo.updateProductOwner(id, data.ownerTeamId);
    } else {
        // Fallback or no-op if no fields provided (though in this specific function we mostly just update owner)
        // For strictness we could throw, but existing logic implied simple update
        result = productRes;
    }

    // 4. Apply Cascading Rules
    if (data.ownerTeamId) {
        // Fetch team's AD Group ID for ARM Sync
        const teamRes = await teamsRepo.getTeamById(data.ownerTeamId);
        const team = teamRes.rows[0];

        // Standard Rule: Update all associated APIs to the same owner team.
        console.log(`[ProductsService] Standard Rule: Cascading ownership update for product ${id} to all its APIs.`);
        await productsRepo.cascadeUpdateApiOwner(id, data.ownerTeamId);

        // 4. Trigger ARM Metadata Sync
        if (team?.azure_ad_group_id) {
            // In a real app, 'id' is the product name (e.g. 'payments')
            // And we'd loop through environments if the product exists in multiple.
            // For this POC, we'll use the record's environment.
            const env = result.rows[0].environment || 'DEV';

            // Trigger ARM Metadata Sync
            const apim = await getApimService();
            apim.updateProductMetadata(result.rows[0].name, team.azure_ad_group_id, env)
                .catch((err: any) => console.error('[ProductsService] ARM Sync Failed Background:', err));
        }
    }

    // 5. Log Audit (Mock user ID for now)
    await logAudit({
        entityType: 'PRODUCT',
        entityId: id,
        action: 'UPDATE_PRODUCT',
        userId: 'system-user',
        changes: data
    });

    return result.rows[0];
}

/**
 * Fetch a unified view of all products and APIs across regions for the Admin dashboard.
 * Groups by resource name to identify regional mismatches.
 */
export async function getGlobalInventory() {
    // 1. Grouped Products
    const productRes = await productsRepo.getGlobalProducts();

    // 2. Grouped APIs
    const apiRes = await apisRepo.getGlobalApis();

    return {
        products: productRes.rows,
        apis: apiRes.rows
    };
}

/**
 * Fetch the permission matrix for a specific product.
 */
export async function getPermissionMatrix(productId: string) {
    const res = await productsRepo.getPermissionMatrix(productId);

    // Process rows into a cleaner format if needed
    return res.rows.map((row: any) => ({
        id: row.id,
        productId: row.product_id,
        adGroupId: row.ad_group_id,
        adGroupName: row.ad_group_name || 'External Group',
        environment: row.environment,
        role: row.role,
        updatedAt: row.updated_at
    }));
}

/**
 * Sync the permission matrix for a product.
 * Replaces old entries with new ones.
 */
export async function updatePermissionMatrix(productId: string, entries: { adGroupId: string, environment: string, role: string }[]) {
    // 1. Clear existing entries for this product
    await productsRepo.deletePermissionMatrix(productId);

    // 2. Insert new entries
    const results = [];
    for (const entry of entries) {
        const res = await productsRepo.insertPermissionMatrixEntry(productId, entry.adGroupId, entry.environment, entry.role);
        results.push(res.rows[0]);
    }

    // 3. Trigger ARM Sync for each entry if needed
    // (In a real app, you might only sync 'Admin' or 'Contributor' groups)
    const apim = await getApimService();
    for (const entry of entries) {
        apim.updateProductMetadata(productId, entry.adGroupId, entry.environment)
            .catch((err: any) => console.error('[ProductsService] Matrix ARM Sync Failed Background:', err));
    }

    // 4. Log Audit
    await logAudit({
        entityType: 'PRODUCT',
        entityId: productId,
        action: 'UPDATE_PERMISSION_MATRIX',
        userId: 'system-user',
        changes: { entryCount: entries.length }
    });

    return results;
}

/**
 * NAMED VALUES - DEPRECATED
 * All named values operations moved to NamedValuesService.ts
 * This section kept for reference during migration, will be removed soon.
 */

/**
 * Generate GitOps Manifest (JSON or TFVars)
 * This ensures the backend is the source of truth for the export format.
 */
export async function generateManifest(productId: string, format: 'json' | 'tfvars') {
    // 1. Fetch Data
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const product = productRes.rows[0];

    const apisRes = await apisRepo.getAllApisByProductId(productId);
    const apis = apisRes.rows;

    // Use namedValuesRepo instead of productsRepo
    const valuesRes = await namedValuesRepo.getNamedValues(productId);
    const values = valuesRes.rows;

    // 2. Group Values
    const productValues = values.filter((v: any) => !v.scope_id);
    const apiValues = values.filter((v: any) => v.scope_id);

    // 3. Generate Format
    if (format === 'json') {
        const payload = {
            product: product.name,
            environment: product.environment,
            repoUrl: await getRepoUrlForResource(productId),
            configuration: {
                shared: productValues.reduce((acc: any, nv: any) => ({
                    ...acc,
                    [nv.system_name]: {
                        displayName: nv.display_name,
                        value: nv.type === 'key_vault' ? `[KV Reference]` : nv.value,
                        isSecret: nv.is_secret,
                        type: nv.type
                    }
                }), {}),
                apis: apis.map((api: any) => ({
                    apiName: api.name,
                    values: apiValues
                        .filter((nv: any) => nv.scope_id === api.id)
                        .reduce((acc: any, nv: any) => ({
                            ...acc,
                            [nv.system_name]: {
                                displayName: nv.display_name,
                                value: nv.type === 'key_vault' ? `[KV Reference]` : nv.value,
                                isSecret: nv.is_secret
                            }
                        }), {})
                })).filter((a: any) => Object.keys(a.values).length > 0)
            }
        };
        return JSON.stringify(payload, null, 2);
    } else {
        let tf = `# Product Configuration: ${product.display_name}\n`;
        const repoUrl = await getRepoUrlForResource(productId);
        if (repoUrl) tf += `# Repository: ${repoUrl}\n`;
        tf += `\n`;

        // Product Level
        tf += `product_named_values = {\n`;
        productValues.forEach((nv: any) => {
            tf += `  "${nv.system_name}" = {\n`;
            tf += `    display_name = "${nv.display_name}"\n`;
            tf += `    value        = "${nv.type === 'key_vault' ? '<KV_REF>' : nv.value}"\n`;
            tf += `    secret       = ${nv.is_secret}\n`;
            tf += `  }\n`;
        });
        tf += `}\n\n`;

        // API Level
        tf += `api_named_values = {\n`;
        apis.forEach((api: any) => {
            const myValues = apiValues.filter((nv: any) => nv.scope_id === api.id);
            if (myValues.length > 0) {
                tf += `  "${api.name}" = {\n`;
                myValues.forEach((nv: any) => {
                    tf += `    "${nv.system_name}" = "${nv.type === 'key_vault' ? '<KV_REF>' : nv.value}"\n`;
                });
                tf += `  }\n`;
            }
        });
        tf += `}\n`;

        return tf;
    }
}
/**
 * Eject Product from Terraform Management to Self-Service
 * 
 * 1. Snapshots the live state (Mocked: Assumes DB is sync'd)
 * 2. Unlocks the DB record (Sets management_mode = UNTRACKED)
 * 3. Logs the "Smart Decomposition" event
 */
export async function ejectProduct(productId: string) {
    const config = getAppConfig();
    if (!productId) throw new Error('Product ID is required');

    // 1. Validate Current State
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const product = productRes.rows[0];

    if (product.management_mode !== 'TERRAFORM_MANAGED') {
        throw new Error(`Product is already ${product.management_mode}. No need to eject.`);
    }

    // 2. Perform "Smart Decomposition" - Multi-Environment Extraction (User req: "Eject based on all regions")
    console.log(`[ProductsService] Ejecting ${productId}: Fetching live state from Multi-Region APIM...`);

    const apimService = await getApimService();
    const environments = ['DEV', 'QA', 'STAGE', 'PROD'];

    // Store extracted variables per environment [env -> { key: value }]
    const envConfigs: Record<string, Record<string, string>> = {};
    let baseXml = '<policies><inbound><base /></inbound><backend><base /></backend><outbound><base /></outbound></policies>';

    // 2a. Scrape all environments
    for (const env of environments) {
        try {
            const arm = await apimService.getArmService(env);
            const liveXml = await arm.getProductPolicy(productId);

            if (liveXml) {
                const decomposition = decomposePolicyXml(liveXml);

                // We take DEV as the "Base XML" structure
                if (env === 'DEV') {
                    baseXml = decomposition.cleanedXml;
                }

                // Store variables for this env
                envConfigs[env] = decomposition.variables.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {});
            }
        } catch (e) {
            console.warn(`[Eject] Could not scrape ${env} (might not exist):`, e);
            envConfigs[env] = {};
        }
    }

    // 2b. Calculate Diffs & Base
    // Base = DEV config
    const baseConfig = envConfigs['DEV'] || {};
    const extractedVars: { name: string, value: string }[] = Object.entries(baseConfig).map(([k, v]) => ({ name: k, value: v as string }));

    // 2c. Save Base Named Values to DB (Source of Truth for Portal)
    for (const v of extractedVars) {
        try {
            await createNamedValue(productId, {
                displayName: `Ejected: ${v.name}`,
                systemName: v.name,
                value: v.value,
                type: 'literal',
                isSecret: v.value.includes('secret') || v.value.includes('key'),
                allowOverwrite: true
            });
        } catch (e) { /* Ignore */ }
    }

    // 2d. Prepare Repo Files (Base + Env Overlays)
    const repoFiles = [
        { path: 'policies/product-policy.xml', content: baseXml },
        // Base Config (Dev)
        {
            path: `config/base.json`,
            content: JSON.stringify({ variables: baseConfig }, null, 2)
        }
    ];

    // Add Env-Specific Configs (only if they differ from Base/Dev, or just dump all for completeness?)
    // User asked for "extracting values for dev qa stage prod".
    // Best practice: Write specific config files for each env.
    for (const env of environments) {
        if (env === 'DEV') continue; // Handled as base

        const currentConfig = envConfigs[env];
        if (Object.keys(currentConfig).length > 0) {
            // Calculate diff if we wanted to be sparse, but for "Eject" explicit is safer.
            // We write the FULL config for that env to ensure it works immediately.
            repoFiles.push({
                path: `config/${env.toLowerCase()}.json`,
                content: JSON.stringify({ variables: currentConfig }, null, 2)
            });
        }
    }

    // 2e. Setup Git Repository
    const repoUrl = product.git_repo_url || `https://dev.azure.com/org/proj/_git/${productId}-portal`;
    if (repoUrl && !config.useBackendMocks) {
        const repoLoader = new RepoService();
        try {
            await repoLoader.commitFiles(productId, repoUrl, repoFiles, 'chore: Initialize portal-managed product (Multi-Env Eject)');
        } catch (err) {
            console.warn(`[ProductsService] Git initialization failed during eject:`, err);
        }
    }

    // 3. Update Database State
    const result = await productsRepo.setProductManagementMode(productId, 'UNTRACKED', 'MANUAL');

    // 4. Log Audit
    await logAudit({
        entityType: 'PRODUCT',
        entityId: productId,
        action: 'EJECT_PRODUCT',
        userId: 'system-user',
        changes: {
            fromMode: 'TERRAFORM_MANAGED',
            toMode: 'UNTRACKED',
            extractedEnvs: Object.keys(envConfigs).filter(k => Object.keys(envConfigs[k]).length > 0)
        }
    });

    return result.rows[0];
}
/**
 * Fetch Product Policy XML
 * SOURCE OF TRUTH: 
 * 1. If Deployed (has hash) -> Fetch from Git (source of truth for managed state)
 * 2. Else -> Fetch from Blob Storage (Drafts/Onboarding)
 * 3. Fallback -> APIM (as last resort/discovery)
 */
export async function getProductPolicy(productId: string) {
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const p = productRes.rows[0];

    const repoService = new RepoService();
    let xml: string | null = null;
    let metadata: DiscoveryResult = { path: null, source: 'BLOB', readOnly: false };

    // 1. Try Git Discovery
    if (p.git_repo_url) {
        try {
            const fileList = await repoService.listRepoFiles(productId, p.git_repo_url);
            const resolvedPath = ResourceDiscovery.resolveProductPolicyPath(fileList, p.name, p.environment);

            if (resolvedPath) {
                xml = await repoService.getFileContent(productId, p.git_repo_url, resolvedPath);
                if (xml) {
                    metadata = { path: resolvedPath, source: 'GIT', readOnly: false };
                }
            }
        } catch (err) {
            console.warn(`[ProductsService] Git discovery failed, falling back:`, err);
        }
    }

    // 2. Try Blob Discovery (Standard or Multi-Strategy Path)
    if (!xml) {
        const { getBlobStorage } = await import('../storage/BlobStorageService.js');
        const storage = getBlobStorage();

        // Try both structures in blob
        const blobList = await storage.listAll();
        const resolvedPath = ResourceDiscovery.resolveProductPolicyPath(blobList, p.name, p.environment) || ResourceDiscovery.getDefaultProductPolicyPath(p.name);

        if (await storage.exists(resolvedPath)) {
            const buffer = await storage.download(resolvedPath);
            xml = buffer.toString();
            metadata = { path: resolvedPath, source: 'BLOB', readOnly: false };
        }
    }

    // 3. Fallback to APIM Live State (Governance Warning)
    if (!xml && p.last_deployed_commit_hash) {
        console.log(`[ProductsService] Falling back to APIM Live State for ${p.name}`);
        const apim = await getApimService();
        xml = await apim.getProductPolicy(p.name, p.environment);
        metadata = {
            path: 'LIVE_APIM',
            source: 'APIM',
            readOnly: true,
            warning: '⚠️ Read-Only: This policy is fetched from APIM Live State. Changes must be committed to Git for deployment.'
        };
    }

    return {
        id: productId,
        policyXml: xml || '<policies>\n  <inbound>\n    <base />\n  </inbound>\n  <backend>\n    <base />\n  </backend>\n  <outbound>\n    <base />\n  </outbound>\n  <on-error>\n    <base />\n  </on-error>\n</policies>',
        metadata
    };
}

/**
 * Update Product Policy XML
 * SOURCE OF TRUTH:
 * 1. If Deployed -> Commit to Git (Saga then deploys)
 * 2. Else -> Update Blob Storage (Draft)
 */
export async function updateProductPolicy(productId: string, xml: string, userContext: { id: string, role: string, teams: string[], groups: string[] }) {
    // 1. Fetch Product
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const p = productRes.rows[0];

    // 2. Validate Access (Must have WRITE access)
    const accessLevel = await calculateAccessLevel(p, userContext, p.environment);
    if (accessLevel !== 'WRITE') {
        throw new Error(`ACCESS_DENIED: You do not have permission to edit policies in ${p.environment}.`);
    }

    // 3. Resolve Path via Discovery
    const repoService = new RepoService();
    const fileList = p.git_repo_url ? await repoService.listRepoFiles(productId, p.git_repo_url).catch(() => []) : [];
    const resolvedPath = ResourceDiscovery.resolveProductPolicyPath(fileList, p.name, p.environment)
        || ResourceDiscovery.getDefaultProductPolicyPath(p.name);

    if (p.last_deployed_commit_hash && p.git_repo_url) {
        // Target: Git (Source of truth for managed state)
        console.log(`[ProductsService] Committing live policy update to Git for ${p.name} at ${resolvedPath}`);
        const newHash = await repoService.commitFiles(productId, p.git_repo_url, [
            { path: resolvedPath, content: xml }
        ], `chore: Update policy for ${p.name} via Policy Studio`);

        await productsRepo.updateProduct(productId, { last_deployed_commit_hash: newHash });
    } else {
        // Target: Blob Storage (Draft)
        console.log(`[ProductsService] Updating policy draft in Blob Storage: ${resolvedPath}`);
        const { getBlobStorage } = await import('../storage/BlobStorageService.js');
        const storage = getBlobStorage();
        await storage.upload(Buffer.from(xml), resolvedPath, userContext.id);
    }

    await logAudit({
        entityType: 'PRODUCT',
        entityId: productId,
        action: 'UPDATE_POLICY',
        userId: userContext.id,
        changes: { note: 'Product Policy Updated via Policy Studio', destination: p.last_deployed_commit_hash ? 'GIT' : 'BLOB' }
    });

    return { success: true };
}

/**
 * Sync Operations from Spec to DB
 * This parses the current spec and populates the 'operations' table.
 */
export async function syncProductOperations(productId: string) {
    try {
        // 1. Fetch Spec
        const specContent = await fetchSpecForProduct(productId);
        if (!specContent) return;

        // 2. Parse Spec
        const api = await SwaggerParser.parse(specContent);
        if (!api.paths) return;

        // 3. Get API ID for this product (Assuming 1:1 for MVP, or first API)
        // In full model, we need to know WHICH API this spec belongs to.
        // For now, we look up the API linked to this product.
        const apisRes = await apisRepo.getAllApisByProductId(productId);
        if (apisRes.rows.length === 0) return;

        const apiId = apisRes.rows[0].id; // Target first API

        // 4. Extract and Upsert Operations
        const operations = [];
        for (const [path, methods] of Object.entries(api.paths)) {
            for (const [method, details] of Object.entries(methods as any)) {
                if (['get', 'post', 'put', 'delete', 'patch', 'head', 'options'].includes(method.toLowerCase())) {
                    operations.push({
                        apiId,
                        method: method.toUpperCase(),
                        path: path, // Raw path
                        urlTemplate: path, // For now same as path
                        displayName: (details as any).summary || (details as any).operationId || `${method.toUpperCase()} ${path}`,
                        description: (details as any).description || ''
                    });
                }
            }
        }

        console.log(`[Sync] Found ${operations.length} operations for product ${productId}. Syncing to DB...`);

        for (const op of operations) {
            await operationsRepo.upsertOperation(op);
        }

        return { count: operations.length };

    } catch (error) {
        console.error("Failed to sync operations from spec:", error);
        // Do not throw, best effort
        return undefined;
    }
}
