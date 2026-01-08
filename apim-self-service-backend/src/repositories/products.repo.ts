import { query } from '../services/core/db.js';

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

    async getAllProductsPaginated(
        environment?: string,
        userRole: string = 'admin',
        teamId?: string,
        userGroups: string[] = [],
        limit: number = 20,
        offset: number = 0
    ) {
        // Build WHERE clauses (same as getAllProducts)
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

            const rbacCondition = userGroups.length > 0
                ? `EXISTS (SELECT 1 FROM permission_matrix pm WHERE pm.product_id = p.id AND pm.ad_group_id = ANY($${paramIndex++}::text[]))`
                : '1=0';

            if (userGroups.length > 0) queryParams.push(userGroups);

            whereConditions.push(`(${teamCondition} OR ${rbacCondition})`);
        }

        const whereClause = whereConditions.length > 0
            ? `WHERE ${whereConditions.join(' AND ')}`
            : '';

        // Get total count
        const countResult = await query(`
            SELECT COUNT(*) as total
            FROM products p
            ${whereClause}
        `, queryParams);

        const total = parseInt(countResult.rows[0]?.total || '0');

        // Get paginated data
        const limitParam = `$${paramIndex++}`;
        const offsetParam = `$${paramIndex++}`;
        queryParams.push(limit, offset);

        const dataResult = await query(`
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
            LIMIT ${limitParam} OFFSET ${offsetParam}
        `, queryParams);

        return { rows: dataResult.rows, total };
    }



    async getRepoUrlForProduct(productId: string) {
        return await query('SELECT git_repo_url FROM products WHERE id = $1', [productId]);
    }

    async addProduct(product: any) {
        return await query(`
            INSERT INTO products (
                id, name, display_name, description, state, owner_team_id, environment, management_mode, git_repo_url, git_file_path, 
                dev_hash, qa_hash, stage_hash, production_hash,
                created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 
                $11, $12, $13, $14,
                NOW(), NOW())
            RETURNING *
        `, [
            product.id, product.name, product.displayName, product.description, product.state, product.ownerTeamId, product.environment,
            product.managementMode || 'UNTRACKED', product.gitRepoUrl, product.gitFilePath,
            product.devHash || null, product.qaHash || null, product.stageHash || null, product.prodHash || null
        ]);
    }

    async getProductById(id: string) {
        return await query(`
            SELECT p.*, 
                   p.production_hash as prod_hash,
                   ar.client_id as identity_client_id,
                   ar.display_name as identity_display_name,
                   ar.app_id_uri as identity_app_id_uri,
                   ar.type as identity_type
            FROM products p
            LEFT JOIN app_registrations ar ON ar.product_id = p.id AND ar.api_id IS NULL
            WHERE p.id = $1
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

    async getGlobalProducts() {
        return await query(`
            SELECT 
                p.name, 
                p.display_name as "displayName", 
                p.description,
                json_agg(json_build_object(
                    'id', p.id,
                    'environment', p.environment,
                    'state', p.state,
                    'ownerTeamId', p.owner_team_id
                )) as deployments
            FROM products p
            GROUP BY p.name, p.display_name, p.owner_team_id, t.name
            ORDER BY p.display_name ASC
        `);
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
