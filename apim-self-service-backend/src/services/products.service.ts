/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

/**
 * @fileoverview Products Service
 * 
 * Handles product-related business logic and database queries
 */

// import { updateProductMetadata } from './apim.service.js'; // Removed for dynamic mock support
import { logAudit } from './audit.service.js';
import { decomposePolicyXml } from './policy-builder.service.js';
import { RepoService } from './ado/RepoService.js';
import { getAppConfig } from '../config/loader.js';
import { ProductsRepository } from '../repositories/products.repo.js';

const productsRepo = new ProductsRepository();

/**
 * Helper to get the APIM service (Mocked if requested)
 */
async function getApimService() {
    const config = getAppConfig();
    const isMock = config.useBackendMocks;
    if (isMock) {
        return await import('./apim.service.mock.js');
    }
    return await import('./apim.service.js');
}

/**
 * Fetch all products with their associated APIs and calculated subscriber counts
 * @param environment Optional environment filter (DEV, QA, STAGE, PROD)
 * @param userRole Optional user role (admin sees all, others see team-filtered)
 * @param teamId Optional team ID filter (ignored if userRole is 'admin')
 * @param userGroups Optional list of AD Group IDs the user belongs to
 */
export async function getAllProducts(environment?: string, userRole: string = 'admin', teamId?: string, userGroups: string[] = []) {
    const productRes = await productsRepo.getAllProducts(environment, userRole, teamId, userGroups);
    const apiRes = await productsRepo.getAllApis();

    // 3. Assemble with complete field mapping
    const products = productRes.rows.map((p: any) => ({
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
        authorizedTeams: p.authorized_teams || [],

        // Metrics
        subscriberCount: p.calculated_subscriber_count,
        qualityScore: p.quality_score,

        // Management
        managementMode: p.management_mode,
        terraformPipelineUrl: p.terraform_pipeline_url,
        gitRepoUrl: p.git_repo_url,
        gitFilePath: p.git_file_path,
        lastDeployedCommitHash: p.last_deployed_commit_hash,

        // Identity (App Registration)
        identity: p.identity_client_id ? {
            clientId: p.identity_client_id,
            displayName: p.identity_display_name,
            appIdUri: p.identity_app_id_uri
        } : undefined,

        // Timestamps
        createdAt: p.created_at,
        updatedAt: p.updated_at,

        // APIs
        apis: apiRes.rows
            .filter((a: any) => a.product_id === p.id)
            .map((a: any) => ({
                id: a.id,
                name: a.name,
                displayName: a.display_name,
                description: a.description,
                path: a.path,
                qualityScore: a.quality_score,
                originTeamId: a.origin_team_id,
                gitRepoUrl: a.git_repo_url,
                gitFilePath: a.git_file_path,
                operations: a.operations_json || []
            }))
    }));

    return products;
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
    const apiRes = await productsRepo.getRepoUrlForApi(resourceId);

    return apiRes.rows[0]?.git_repo_url || null;
}

/**
 * Fetch all APIs with their parent product display names
 */
export async function getAllApis() {
    const res = await productsRepo.getAllApisDetailed();

    return res.rows.map((a: any) => ({
        ...a,
        productId: a.product_id,
        displayName: a.display_name,
        productDisplayName: a.product_display_name,
        qualityScore: a.quality_score
    }));
}

/**
 * Fetch operations for a specific API
 */
export async function getOperations(apiId: string) {
    const res = await productsRepo.getOperations(apiId);
    return res.rows;
}

/**
 * Search APIs across all products
 */
export async function searchApis(queryTerm: string) {
    const res = await productsRepo.searchApis(queryTerm);

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
    gitRepoUrl?: string,
    gitFilePath?: string
}) {
    const res = await productsRepo.addProduct(product);

    // Log Audit
    await logAudit({
        entityType: 'PRODUCT',
        entityId: product.id,
        action: 'CREATE_PRODUCT',
        userId: 'system-user',
        changes: product
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
    gitRepoUrl?: string,
    gitFilePath?: string
}) {
    const res = await productsRepo.addApi(api);

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
    const res = await productsRepo.removeApi(apiId, productId);

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
export async function updateProduct(id: string, data: { ownerTeamId?: string }) {
    if (!id) throw new Error('Product ID is required');

    // 1. Fetch current product to check type
    const productRes = await productsRepo.getProductById(id);
    if (productRes.rows.length === 0) throw new Error(`Product ${id} not found`);
    // Schema missing type column, standard logic applies

    // 2. Update the Product
    let result;
    if (data.ownerTeamId) {
        result = await productsRepo.updateProductOwner(id, data.ownerTeamId);
    } else {
        // Fallback or no-op if no fields provided (though in this specific function we mostly just update owner)
        // For strictness we could throw, but existing logic implied simple update
        result = productRes;
    }

    // 3. Apply Cascading Rules
    if (data.ownerTeamId) {
        // Fetch team's AD Group ID for ARM Sync
        const teamRes = await productsRepo.getTeamById(data.ownerTeamId);
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
    const apiRes = await productsRepo.getGlobalApis();

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
 * NAMED VALUES (Configuration & Secrets)
 */

export async function getNamedValues(productId: string) {
    const res = await productsRepo.getNamedValues(productId);

    return res.rows.map((row: any) => ({
        ...row,
        scopeName: row.scope_name,
        // If secret, mask the value loosely (frontend should assume masked)
        value: row.is_secret ? '*****' : row.value
    }));
}

export async function addNamedValue(productId: string, data: {
    displayName: string,
    systemName: string,
    value: string,
    type: 'literal' | 'key_vault',
    isSecret: boolean,
    scopeId?: string, // Optional API ID
    allowOverwrite?: boolean
}) {
    // 1. If scoped to API, verify API belongs to Product
    if (data.scopeId) {
        const apiCheck = await productsRepo.checkApiBelongsToProduct(data.scopeId, productId);
        if (apiCheck.rowCount === 0) throw new Error('Invalid Scope: API does not belong to this Product.');
    }

    // 1b. Value Collision Check (Audit Only)
    // Warn/Audit if this exact value is used elsewhere (risk of shared secret sprawl)
    if (!data.isSecret) { // Skip strict secret comparison for now, focus on configs
        const collision = await productsRepo.checkNamedValueCollision(data.value);
        if (collision.rowCount > 0) {
            await logAudit({
                entityType: 'NAMED_VALUE',
                entityId: 'potential-collision',
                action: 'VALUE_COLLISION_DETECTED',
                userId: 'system-user',
                changes: {
                    newSystemName: data.systemName,
                    existingMatch: `${collision.rows[0].product_id}/${collision.rows[0].system_name}`,
                    note: 'Identical value detected across different keys.'
                }
            });
        }
    }

    // 2. Check for Duplicates
    const existing = await productsRepo.getExistingNamedValue(productId, data.systemName, data.scopeId);

    if (existing.rowCount > 0) {
        if (!data.allowOverwrite) {
            throw new Error('DUPLICATE_CONFIRMATION_REQUIRED: Value exists. Confirm overwrite?');
        }

        // 3a. Overwrite (Update)
        const idToUpdate = existing.rows[0].id;
        const res = await productsRepo.updateNamedValue(idToUpdate, data);

        await logAudit({
            entityType: 'NAMED_VALUE',
            entityId: idToUpdate,
            action: 'OVERWRITE_NAMED_VALUE',
            userId: 'system-user',
            changes: { productId, scopeId: data.scopeId, systemName: data.systemName, note: 'User explicitly confirmed overwrite.' }
        });

        return res.rows[0];
    }

    // 3b. Insert New
    const res = await productsRepo.createNamedValue(productId, data);

    await logAudit({
        entityType: 'NAMED_VALUE',
        entityId: res.rows[0].id,
        action: 'CREATE_NAMED_VALUE',
        userId: 'system-user',
        changes: { productId, scopeId: data.scopeId, systemName: data.systemName }
    });

    return res.rows[0];
}

export async function deleteNamedValue(productId: string, valueId: string) {
    const res = await productsRepo.deleteNamedValue(productId, valueId);

    if (res.rowCount === 0) throw new Error('Named Value not found.');

    await logAudit({
        entityType: 'NAMED_VALUE',
        entityId: valueId,
        action: 'DELETE_NAMED_VALUE',
        userId: 'system-user',
        changes: { productId }
    });

    return true;
}

/**
 * Generate GitOps Manifest (JSON or TFVars)
 * This ensures the backend is the source of truth for the export format.
 */
export async function generateManifest(productId: string, format: 'json' | 'tfvars') {
    // 1. Fetch Data
    const productRes = await productsRepo.getProductById(productId);
    if (productRes.rows.length === 0) throw new Error('Product not found');
    const product = productRes.rows[0];

    const apisRes = await productsRepo.getAllApisByProductId(productId);
    const apis = apisRes.rows;

    const valuesRes = await productsRepo.getNamedValues(productId);
    const values = valuesRes.rows;

    // 2. Group Values
    const productValues = values.filter((v: any) => !v.scope_id);
    const apiValues = values.filter((v: any) => v.scope_id);

    // 3. Generate Format
    if (format === 'json') {
        const payload = {
            product: product.name,
            environment: product.environment,
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
        let tf = `# Product Configuration: ${product.display_name}\n\n`;

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
 * 2. Unlocks the DB record (Sets management_mode = PORTAL_MANAGED)
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

    // 2. Perform "Smart Decomposition"
    console.log(`[ProductsService] Ejecting ${productId}: Fetching live state from APIM...`);

    const apimService = await getApimService();
    const arm = await apimService.getArmService(product.environment);

    // a) Fetch Live XML
    const liveXml = await arm.getProductPolicy(productId);

    let finalXml = liveXml || '<policies><inbound><base /></inbound><backend><base /></backend><outbound><base /></outbound></policies>';
    let extractedVars: { name: string, value: string }[] = [];

    if (liveXml) {
        // b) Decompose
        const decomposition = decomposePolicyXml(liveXml);
        finalXml = decomposition.cleanedXml;
        extractedVars = decomposition.variables;

        // c) Save Ejected Named Values
        for (const v of extractedVars) {
            try {
                await addNamedValue(productId, {
                    displayName: `Ejected: ${v.name}`,
                    systemName: v.name,
                    value: v.value,
                    type: 'literal',
                    isSecret: v.value.includes('secret') || v.value.includes('key'), // Basic secret heuristic
                    allowOverwrite: true
                });
            } catch (e) {
                // Ignore if exists
            }
        }
    }

    // d) Setup Git Repository (TF Layout)
    const repoUrl = product.repository_url || `https://dev.azure.com/org/proj/_git/${productId}-portal`;
    if (repoUrl && !config.useBackendMocks) {
        const repoLoader = new RepoService();
        const files = [
            { path: 'policies/product-policy.xml', content: finalXml },
            {
                path: `config/${product.environment.toLowerCase()}.json`,
                content: JSON.stringify({
                    variables: extractedVars.reduce((acc, v) => ({ ...acc, [v.name]: v.value }), {})
                }, null, 2)
            }
        ];

        try {
            await repoLoader.commitFiles(productId, repoUrl, files, 'chore: Initialize portal-managed product via Smart Decomposition');
        } catch (err) {
            console.warn(`[ProductsService] Git initialization failed during eject (ignoring):`, err);
        }
    }

    // 3. Update Database State
    const result = await productsRepo.setProductManagementMode(productId, 'PORTAL_MANAGED', 'MANUAL');

    // 4. Log Audit
    await logAudit({
        entityType: 'PRODUCT',
        entityId: productId,
        action: 'EJECT_PRODUCT',
        userId: 'system-user',
        changes: {
            fromMode: 'TERRAFORM_MANAGED',
            toMode: 'PORTAL_MANAGED',
            extractedVariables: extractedVars.length
        }
    });

    return result.rows[0];
}
/**
 * Fetch Product Policy XML
 */
export async function getProductPolicy(productId: string) {
    const res = await productsRepo.getProductPolicy(productId);
    if (res.rows.length === 0) throw new Error('Product not found');
    return {
        id: productId,
        policyXml: res.rows[0].policy_xml || '<policies>\n  <inbound>\n    <base />\n  </inbound>\n  <backend>\n    <base />\n  </backend>\n  <outbound>\n    <base />\n  </outbound>\n  <on-error>\n    <base />\n  </on-error>\n</policies>'
    };
}

/**
 * Update Product Policy XML
 */
export async function updateProductPolicy(productId: string, xml: string) {
    const res = await productsRepo.updateProductPolicy(productId, xml);
    if (res.rows.length === 0) throw new Error('Product not found');

    await logAudit({
        entityType: 'PRODUCT',
        entityId: productId,
        action: 'UPDATE_POLICY',
        userId: 'system-user',
        changes: { note: 'Product Policy Updated via Policy Studio' }
    });

    return res.rows[0];
}
