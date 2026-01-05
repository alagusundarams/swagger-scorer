import { query } from '../services/db.js';

export class ProductsRepository {
    async getAllProducts(environment?: string, userRole: string = 'admin', teamId?: string, userGroups: string[] = []) {
        // Build WHERE clauses
        const whereConditions: string[] = [];
        const queryParams: any[] = [];
        let paramIndex = 1;

        if (environment && environment !== 'ALL') {
            whereConditions.push(`p.environment = $${paramIndex++}`);
            queryParams.push(environment);
        }

        // Filter by Team OR Permission Matrix if not Admin
        if (userRole !== 'admin') {
            const teamCondition = teamId ? `p.owner_team_id = $${paramIndex++}` : '1=0';
            if (teamId) queryParams.push(teamId);

            // RBAC: Check if user has ANY role in permission_matrix for this product via their groups
            // We use ANY($n) for array comparison in Postgres
            const rbacCondition = userGroups.length > 0
                ? `EXISTS (SELECT 1 FROM permission_matrix pm WHERE pm.product_id = p.id AND pm.ad_group_id = ANY($${paramIndex++}::text[]))`
                : '1=0';

            if (userGroups.length > 0) queryParams.push(userGroups);

            whereConditions.push(`(${teamCondition} OR ${rbacCondition})`);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        return await query(`
            SELECT p.*, 
                   t.name as owner_team_name,
                   p.dev_hash, p.qa_hash, p.stage_hash, p.production_hash as prod_hash,
                   COALESCE(sub_counts.active_subscribers, 0) as calculated_subscriber_count,
                   ar.client_id as identity_client_id,
                   ar.display_name as identity_display_name
            FROM products p
            LEFT JOIN teams t ON p.owner_team_id = t.id
            LEFT JOIN app_registrations ar ON ar.product_id = p.id AND ar.api_id IS NULL
            LEFT JOIN LATERAL (
                SELECT COUNT(*) as active_subscribers
                FROM subscriptions
                WHERE subscriptions.product_id = p.id
                AND subscriptions.state = 'active'
            ) sub_counts ON true
            ${whereClause}
            ORDER BY p.display_name ASC
        `, queryParams);
    }

    async getAllApis() {
        return await query(`
            SELECT a.*, o.json_data as operations_json
            FROM apis a
            LEFT JOIN LATERAL (
                SELECT json_agg(op.*) as json_data
                FROM operations op
                WHERE op.api_id = a.id
            ) o ON true
        `);
    }

    async getRepoUrlForProduct(productId: string) {
        return await query('SELECT git_repo_url FROM products WHERE id = $1', [productId]);
    }

    async getRepoUrlForApi(apiId: string) {
        return await query(`
            SELECT p.git_repo_url 
            FROM products p
            JOIN apis a ON a.product_id = p.id
            WHERE a.id = $1
        `, [apiId]);
    }

    async getAllApisDetailed() {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            ORDER BY a.display_name ASC
        `);
    }

    async getOperations(apiId: string) {
        return await query(`
            SELECT * FROM operations
            WHERE api_id = $1
            ORDER BY url_template ASC, method ASC
        `, [apiId]);
    }

    async searchApis(queryTerm: string) {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            WHERE a.display_name ILIKE $1 
               OR a.path ILIKE $1
               OR a.description ILIKE $1
            ORDER BY a.display_name ASC
            LIMIT 50
        `, [`%${queryTerm}%`]);
    }

    async addProduct(product: any) {
        return await query(`
                id, name, display_name, description, state, owner_team_id, environment, management_mode, git_repo_url, git_file_path, 
                dev_hash, qa_hash, stage_hash, prod_hash,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                $11, $12, $13, $14,
                NOW(), NOW())
            RETURNING *
        `, [
            product.id, product.name, product.displayName, product.description, product.state, product.ownerTeamId, product.environment,
            product.managementMode || 'PORTAL_MANAGED', product.gitRepoUrl, product.gitFilePath,
            product.devHash || null, product.qaHash || null, product.stageHash || null, product.prodHash || null
        ]);
    }

    async addApi(api: any) {
        return await query(`
            INSERT INTO apis (
                id, product_id, name, display_name, description, path, quality_score, origin_team_id, git_repo_url, git_file_path, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
            RETURNING *
        `, [
            api.id, api.productId, api.name, api.displayName, api.description, api.path,
            api.qualityScore || 0, api.originTeamId, api.gitRepoUrl, api.gitFilePath
        ]);
    }

    async upsertOperation(op: any) {
        return await query(`
            INSERT INTO operations (
                api_id, method, path, display_name, description, url_template
            ) VALUES ($1, $2, $3, $4, $5, $6)
            ON CONFLICT (api_id, method, path) 
            DO UPDATE SET 
                display_name = EXCLUDED.display_name,
                description = EXCLUDED.description,
                url_template = EXCLUDED.url_template
            RETURNING *
        `, [op.apiId, op.method, op.path, op.displayName, op.description, op.urlTemplate]);
    }

    async removeApi(apiId: string, productId: string) {
        return await query(`
            DELETE FROM apis 
            WHERE id = $1 AND product_id = $2
            RETURNING *
        `, [apiId, productId]);
    }

    async getProductById(id: string) {
        return await query(`
            SELECT p.*, 
                   p.production_hash as prod_hash,
                   ar.client_id as identity_client_id,
                   ar.display_name as identity_display_name
            FROM products p
            LEFT JOIN app_registrations ar ON ar.product_id = p.id AND ar.api_id IS NULL
            WHERE p.id = $1
        `, [id]);
    }

    async getApiById(id: string) {
        return await query(`
            SELECT a.*, p.display_name as product_display_name
            FROM apis a
            JOIN products p ON a.product_id = p.id
            WHERE a.id = $1
        `, [id]);
    }

    async updateProductOwner(id: string, ownerTeamId: string) {
        return await query(
            'UPDATE products SET owner_team_id = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [ownerTeamId, id]
        );
    }

    async cascadeUpdateApiOwner(productId: string, ownerTeamId: string) {
        return await query(
            'UPDATE apis SET origin_team_id = $1, updated_at = NOW() WHERE product_id = $2',
            [ownerTeamId, productId]
        );
    }

    async getTeamById(teamId: string) {
        return await query('SELECT azure_ad_group_id, name FROM teams WHERE id = $1', [teamId]);
    }

    async getGlobalProducts() {
        return await query(`
            SELECT 
                p.name, 
                p.display_name as "displayName", 
                'standard' as type, 
                p.owner_team_id as "ownerTeamId", 
                t.name as "ownerTeamName",
                json_agg(json_build_object(
                    'id', p.id,
                    'environment', p.environment,
                    'state', p.state,
                    'gitRepoUrl', p.git_repo_url,
                    'managementMode', p.management_mode,
                    'qualityScore', p.quality_score,
                    'reconciliationStatus', CASE 
                        WHEN p.management_mode = 'PORTAL_MANAGED' AND (p.git_repo_url IS NULL OR p.git_repo_url = '') THEN 'GHOST'
                        WHEN p.management_mode = 'PORTAL_MANAGED' THEN 'MANUAL'
                        ELSE 'RECONCILED'
                    END
                )) as deployments
            FROM products p
            LEFT JOIN teams t ON p.owner_team_id = t.id
            GROUP BY p.name, p.display_name, p.owner_team_id, t.name
            ORDER BY p.display_name ASC
        `);
    }

    async getGlobalApis() {
        return await query(`
            SELECT 
                a.name, 
                a.display_name as "displayName", 
                a.path,
                json_agg(json_build_object(
                    'id', a.id,
                    'productId', a.product_id,
                    'environment', p.environment,
                    'qualityScore', a.quality_score,
                    'originTeamId', a.origin_team_id
                )) as deployments
            FROM apis a
            JOIN products p ON a.product_id = p.id
            GROUP BY a.name, a.display_name, a.path
            ORDER BY a.display_name ASC
        `);
    }

    async getPermissionMatrix(productId: string) {
        return await query(`
            SELECT pm.*, t.name as ad_group_name
            FROM permission_matrix pm
            LEFT JOIN teams t ON pm.ad_group_id = t.azure_ad_group_id
            WHERE pm.product_id = $1
            ORDER BY pm.environment, pm.role
        `, [productId]);
    }

    async deletePermissionMatrix(productId: string) {
        return await query('DELETE FROM permission_matrix WHERE product_id = $1', [productId]);
    }

    async insertPermissionMatrixEntry(productId: string, adGroupId: string, environment: string, role: string) {
        return await query(`
            INSERT INTO permission_matrix (product_id, ad_group_id, environment, role)
            VALUES ($1, $2, $3, $4)
            RETURNING *
        `, [productId, adGroupId, environment, role]);
    }

    async getNamedValues(productId: string) {
        return await query(`
            SELECT nv.*, 
                   CASE 
                       WHEN nv.scope_id IS NULL THEN 'Product Level'
                       ELSE a.display_name 
                   END as scope_name
            FROM named_values nv
            LEFT JOIN apis a ON nv.scope_id = a.id
            WHERE nv.product_id = $1
            ORDER BY nv.scope_id NULLS FIRST, nv.display_name ASC
        `, [productId]);
    }

    async checkApiBelongsToProduct(apiId: string, productId: string) {
        return await query('SELECT id FROM apis WHERE id = $1 AND product_id = $2', [apiId, productId]);
    }

    async checkNamedValueCollision(value: string) {
        return await query(
            'SELECT product_id, system_name FROM named_values WHERE value = $1 LIMIT 1',
            [value]
        );
    }

    async getExistingNamedValue(productId: string, systemName: string, scopeId?: string) {
        return await query(
            'SELECT id FROM named_values WHERE product_id = $1 AND system_name = $2 AND (scope_id = $3 OR (scope_id IS NULL AND $3 IS NULL))',
            [productId, systemName, scopeId || null]
        );
    }

    async updateNamedValue(id: string, data: any) {
        return await query(`
            UPDATE named_values 
            SET display_name = $1, value = $2, type = $3, is_secret = $4, environment = $5, region = $6, updated_at = NOW()
            WHERE id = $7
            RETURNING *
        `, [data.displayName, data.value, data.type, data.isSecret, data.environment, data.region || 'Global', id]);
    }

    async createNamedValue(productId: string, data: any) {
        return await query(`
            INSERT INTO named_values (
                product_id, scope_id, display_name, system_name, value, type, is_secret, environment, region
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `, [productId, data.scopeId || null, data.displayName, data.systemName, data.value, data.type, data.isSecret, data.environment, data.region || 'Global']);
    }

    async deleteNamedValue(productId: string, valueId: string) {
        return await query(`
            DELETE FROM named_values WHERE id = $1 AND product_id = $2 RETURNING *
        `, [valueId, productId]);
    }

    async getAllApisByProductId(productId: string) {
        return await query('SELECT * FROM apis WHERE product_id = $1', [productId]);
    }

    async setProductManagementMode(productId: string, mode: string, reconciliationStatus: string) {
        return await query(
            `UPDATE products 
             SET management_mode = $1, 
                 reconciliation_status = $2, 
                 updated_at = NOW() 
             WHERE id = $3
             RETURNING *`,
            [mode, reconciliationStatus, productId]
        );
    }

    async getProductPolicy(productId: string) {
        return await query('SELECT policy_xml FROM products WHERE id = $1', [productId]);
    }

    async updateProductPolicy(productId: string, xml: string) {
        return await query(
            'UPDATE products SET policy_xml = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
            [xml, productId]
        );
    }
}

export interface NamedValue {
    id: string;
    product_id: string;
    scope_id?: string;
    display_name: string;
    system_name: string;
    value: string;
    type: 'literal' | 'keyvault';
    is_secret: boolean;
    created_at: Date;
    updated_at: Date;
}
