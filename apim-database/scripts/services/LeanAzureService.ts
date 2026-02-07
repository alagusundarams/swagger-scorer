import { execSync } from 'child_process';

/**
 * Lean Azure DevOps Service
 * 
 * SURGICAL API calls ONLY - no fallbacks, fail fast with clear errors
 * Purpose: Find repo → pipeline → environment-specific deployment hashes
 */

export interface Repo {
    id: string;
    name: string;
    project: {
        id: string;
        name: string;
    };
}

export interface Pipeline {
    id: number;
    name: string;
    project: {
        id: string;
        name: string;
    };
}

export interface RepoHash {
    alias: string;
    hash: string;
    repoName: string;
}

export class LeanAzureService {
    /**
     * Get authentication header
     * Priority: Bearer token (Azure CLI) > PAT
     */
    static getAuthHeader(pat: string, bearerToken?: string): string {
        if (bearerToken) {
            return `Bearer ${bearerToken}`;
        }
        const encodedPat = Buffer.from(`:${pat}`).toString('base64');
        return `Basic ${encodedPat}`;
    }

    /**
     * Get Azure CLI bearer token for ADO
     */
    static async getAdoAccessToken(): Promise<string> {
        try {
            const tokenJson = execSync('az account get-access-token --resource 499b84ac-1321-427f-aa17-267ca6975798', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'ignore']
            });
            const tokenData = JSON.parse(tokenJson);
            return tokenData.accessToken;
        } catch (error) {
            throw new Error('Failed to get Azure CLI token. Run "az login" first.');
        }
    }

    /**
     * STEP 1: Find repository by product name
     * Uses Code Search API with .tf file filter (surgical search)
     */
    static async findRepo(
        org: string,
        productName: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<Repo> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const orgUrl = `${baseUrl}/${org}`;

        // Surgical search: product name in .tf files
        const searchQuery = `${productName} ext:tf`;
        const url = `${orgUrl}/_apis/search/codesearchresults?api-version=7.1-preview.1`;

        console.log(`   🔍 Searching for "${searchQuery}"...`);
        console.log(`   🌐 Organization: "${org}"`);
        console.log(`   🔗 URL: ${url}`);
        console.log(`   🔐 Auth: ${bearerToken ? 'Bearer Token' : 'PAT'}`);

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                searchText: searchQuery,
                $top: 10
            })
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(
                `Code search failed (${response.status} ${response.statusText}).\n` +
                `Organization: "${org}"\n` +
                `URL: ${url}\n` +
                `Response: ${errorBody.substring(0, 200)}`
            );
        }

        const data = await response.json();

        if (!data.results || data.results.length === 0) {
            throw new Error(
                `No repository found containing "${productName}" in .tf files. ` +
                `Verify the product name is correct.`
            );
        }

        const firstResult = data.results[0];
        const repo = firstResult.repository;

        if (!repo || !repo.id || !repo.name) {
            throw new Error(
                `Code search returned invalid repository data. ` +
                `Response structure may have changed.`
            );
        }

        console.log(`   ✅ Found repo: ${repo.name} (ID: ${repo.id})`);

        return {
            id: repo.id,
            name: repo.name,
            project: {
                id: repo.project.id,
                name: repo.project.name
            }
        };
    }

    /**
     * STEP 2: Find pipeline by repository ID
     * Uses Build Definitions API with repositoryId filter (surgical)
     */
    static async findPipeline(
        org: string,
        projectId: string,
        repoId: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<Pipeline> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const orgUrl = `${baseUrl}/${org}`;

        // Surgical query: filter by exact repo ID
        const url = `${orgUrl}/${projectId}/_apis/build/definitions?repositoryId=${repoId}&repositoryType=TfsGit&api-version=7.1`;

        console.log(`   🔍 Searching pipelines for repo ID ${repoId}...`);

        const response = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            throw new Error(
                `Build definitions query failed (${response.status} ${response.statusText}). ` +
                `Check if project ID "${projectId}" is correct.`
            );
        }

        const data = await response.json();

        if (!data.value || data.value.length === 0) {
            throw new Error(
                `No pipeline found for repository "${repoId}". ` +
                `The repository may not have any build definitions.`
            );
        }

        // Take first pipeline (most repos have one main pipeline)
        const pipeline = data.value[0];

        console.log(`   ✅ Found pipeline: ${pipeline.name} (ID: ${pipeline.id})`);

        return {
            id: pipeline.id,
            name: pipeline.name,
            project: {
                id: pipeline.project.id,
                name: pipeline.project.name
            }
        };
    }

    /**
     * STEP 3a: Get environment ID by name
     */
    static async getEnvironmentId(
        org: string,
        projectId: string,
        envName: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<number> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const orgUrl = `${baseUrl}/${org}`;

        const url = `${orgUrl}/${projectId}/_apis/distributedtask/environments?api-version=7.1`;

        console.log(`   🔍 Looking up environment "${envName}"...`);

        const response = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            throw new Error(
                `Environments query failed (${response.status} ${response.statusText}). ` +
                `Check if project "${projectId}" exists and you have permissions.`
            );
        }

        const data = await response.json();

        if (!data.value || data.value.length === 0) {
            throw new Error(
                `No environments found in project "${projectId}". ` +
                `Environments may not be configured for this project.`
            );
        }

        // Find exact match (case-insensitive)
        const envNameLower = envName.toLowerCase();
        const env = data.value.find((e: any) =>
            e.name.toLowerCase() === envNameLower ||
            e.name.toLowerCase().includes(`-${envNameLower}`) ||
            e.name.toLowerCase().includes(`${envNameLower}-`)
        );

        if (!env) {
            const available = data.value.map((e: any) => e.name).join(', ');
            throw new Error(
                `Environment "${envName}" not found. ` +
                `Available environments: ${available}`
            );
        }

        console.log(`   ✅ Found environment: ${env.name} (ID: ${env.id})`);

        return env.id;
    }

    /**
     * STEP 3b: Get latest deployment for pipeline to environment (SURGICAL)
     */
    static async getLatestDeployment(
        org: string,
        projectId: string,
        envId: number,
        pipelineId: number,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<{ buildId: number; finishTime: string }> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const orgUrl = `${baseUrl}/${org}`;

        // SURGICAL: Filter by ownerId (pipeline definition ID)
        const url = `${orgUrl}/${projectId}/_apis/distributedtask/environments/${envId}/deployments?ownerId=${pipelineId}&ownerType=build&$top=1&api-version=7.1`;

        console.log(`   🔍 Fetching latest deployment (pipeline ${pipelineId} → env ${envId})...`);

        const response = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            throw new Error(
                `Deployment query failed (${response.status} ${response.statusText}). ` +
                `Check if environment ID ${envId} exists.`
            );
        }

        const data = await response.json();

        if (!data.value || data.value.length === 0) {
            throw new Error(
                `No deployments found for pipeline ${pipelineId} to environment ${envId}. ` +
                `This pipeline may never have deployed to this environment.`
            );
        }

        const deployment = data.value[0];
        const buildId = deployment.owner?.id || deployment.id;

        if (!buildId) {
            throw new Error(
                `Deployment found but build ID is missing. ` +
                `Response structure may have changed.`
            );
        }

        console.log(`   ✅ Found deployment: Build ${buildId}`);

        return {
            buildId,
            finishTime: deployment.finishTime || deployment.queueTime
        };
    }

    /**
     * STEP 3c: Extract target repo hash from build (multi-repo support)
     */
    static async extractRepoHash(
        org: string,
        projectId: string,
        buildId: number,
        targetRepoId: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<RepoHash> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const orgUrl = `${baseUrl}/${org}`;

        const url = `${orgUrl}/${projectId}/_apis/build/builds/${buildId}?api-version=7.1`;

        console.log(`   🔍 Extracting hash for repo ${targetRepoId} from build ${buildId}...`);

        const response = await fetch(url, {
            headers: { 'Authorization': authHeader }
        });

        if (!response.ok) {
            throw new Error(
                `Build query failed (${response.status} ${response.statusText}). ` +
                `Check if build ${buildId} exists.`
            );
        }

        const build = await response.json();

        // Check for multi-repo resources
        if (!build.resources?.repositories) {
            // Fallback to simple sourceVersion if no multi-repo
            if (build.repository?.id === targetRepoId && build.sourceVersion) {
                console.log(`   ✅ Found hash (single repo): ${build.sourceVersion.substring(0, 7)}`);
                return {
                    alias: 'self',
                    hash: build.sourceVersion,
                    repoName: build.repository.name
                };
            }
            throw new Error(
                `Build ${buildId} has no repository resources and repository ID doesn't match target. ` +
                `Build repo: ${build.repository?.id}, Target: ${targetRepoId}`
            );
        }

        // Multi-repo: Find by exact repo ID
        for (const [alias, resource] of Object.entries(build.resources.repositories)) {
            const r = resource as any;
            if (r.repository?.id === targetRepoId) {
                console.log(`   ✅ Found hash (alias: ${alias}): ${r.version.substring(0, 7)}`);
                return {
                    alias,
                    hash: r.version,
                    repoName: r.repository.name
                };
            }
        }

        // Not found - provide helpful error
        const availableRepos = Object.entries(build.resources.repositories)
            .map(([alias, r]: [string, any]) => `${alias} (${r.repository?.name || 'unknown'})`)
            .join(', ');

        throw new Error(
            `Target repo ${targetRepoId} not found in build resources. ` +
            `Available repos: ${availableRepos}`
        );
    }
}
