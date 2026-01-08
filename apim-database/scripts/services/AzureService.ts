import { execSync } from 'child_process';

export interface APIMConfig {
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
    environment?: string; // Optional as it might be just config
    accessToken?: string;
    devops?: {
        pat: string;
        organization: string;
        baseUrl?: string;
    };
}

export interface ADOProject {
    name: string;
    id: string;
}

export interface ADORepo {
    name: string;
    webUrl: string;
    id: string;
    project: {
        name: string;
        id: string;
    };
}

export interface ADOPipeline {
    id: number;
    name: string;
    folder: string;
    url: string;
    _links: {
        web: { href: string };
    };
}

export interface PipelineRun {
    id: number;
    name: string;
    status: string;
    result: string;
    createdDate: string;
    finishedDate: string;
    resources?: {
        repositories: {
            self: {
                refName: string;
                version: string;
            }
        }
    };
}

export interface TimelineRecord {
    id: string;
    parentId?: string;
    type: string;
    name: string;
    status: string;
    result: string;
    startTime: string;
    finishTime: string;
}

export interface CodeSearchResponse {
    count: number;
    results: {
        fileName: string;
        path: string;
        repository: {
            name: string;
            id: string;
            project: {
                name: string;
                id: string;
            }
        };
        versions: {
            branchName: string;
            changeId: string;
        }[];
    }[];
}

export class AzureService {
    static async getAzureAccessToken(resource: string = 'https://management.azure.com'): Promise<string> {
        try {
            // On Windows, inherit full environment to ensure 'az' is in PATH
            const token = execSync(`az account get-access-token --resource ${resource} --query accessToken -o tsv`, {
                encoding: 'utf-8',
                env: { ...process.env },
                shell: process.platform === 'win32' ? 'cmd.exe' : undefined
            }).trim();

            if (!token || token.length < 10) {
                throw new Error('Azure CLI returned empty or invalid token');
            }
            return token;
        } catch (error: any) {
            const errorMsg = error.stderr?.toString() || error.stdout?.toString() || error.message || 'Unknown error';
            console.error(`❌ [Auth] Failed to get Azure access token: ${errorMsg}`);
            throw new Error(`Failed to get Azure access token. ${errorMsg}. Ensure 'az login' was successful.`);
        }
    }

    /**
     * Correctly joins ADO URL segments based on host type (dev.azure.com vs visualstudio.com).
     * Prevents double slashes and missing organization segments.
     */
    static getVstsUrl(baseUrl: string, org: string, project: string, subPath: string): string {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const cleanOrg = org.replace(/\/+$/, '');
        const cleanProject = project.replace(/\/+$/, '');
        const cleanPath = subPath.replace(/^\/+/, '');

        if (cleanBase.includes('visualstudio.com')) {
            // Handle: https://org.visualstudio.com/Project/_git/Repo
            // Often org is already in the subdomain
            const subdomainMatch = cleanBase.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
            if (subdomainMatch && subdomainMatch[1].toLowerCase() === cleanOrg.toLowerCase()) {
                return `${cleanBase}/${encodeURIComponent(cleanProject)}/${cleanPath}`;
            }
            return `${cleanBase}/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/${cleanPath}`;
        }

        // Handle: https://dev.azure.com/org/Project/_git/Repo
        return `${cleanBase}/${encodeURIComponent(cleanOrg)}/${encodeURIComponent(cleanProject)}/${cleanPath}`;
    }

    /**
     * Fetch data from APIM REST API with pagination support
     */
    static async fetchAPIM<T>(config: APIMConfig, path: string): Promise<{ value: T[] }> {
        const results: T[] = [];
        const baseUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.instance}`;
        let nextLink: string | null = `${baseUrl}${path}?api-version=2022-08-01`;

        while (nextLink) {
            const response = await fetch(nextLink, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const error = await response.text();
                throw new Error(`APIM API error: ${response.status} ${response.statusText}\n${error}`);
            }

            const data = await response.json() as { value: T[], nextLink?: string };
            results.push(...data.value);
            nextLink = data.nextLink || null;
        }

        return { value: results };
    }

    /**
     * Fetch Tags for a specific Product
     */
    static async fetchTagsForProduct(config: APIMConfig, productId: string): Promise<Record<string, string>> {
        try {
            // productId is the full resource ID. We need to append /tags
            const response = await fetch(`https://management.azure.com${productId}/tags?api-version=2022-08-01`, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as { value: Array<{ name: string, properties: { displayName: string } }> };
                const tags: Record<string, string> = {};
                data.value.forEach(tag => {
                    // If tag is 'TeamID:123', we can parse it, or just use the name as key if it's simple
                    if (tag.name.includes(':')) {
                        const [k, v] = tag.name.split(':');
                        tags[k.trim()] = v.trim();
                    } else {
                        tags[tag.name] = 'true';
                    }
                });
                return tags;
            }
        } catch (err) {
            console.warn(`⚠️ [Tags] Failed to fetch tags for ${productId}`);
        }
        return {};
    }

    /**
     * Fetch All Projects from Azure DevOps Organization
     */
    static async fetchADOProjects(org: string, pat: string, baseUrl: string = 'https://dev.azure.com'): Promise<ADOProject[]> {
        console.log(`📡 [ADO] Fetching all projects...`);
        const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        // Remove trailing slash if present
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        let url = `${cleanBaseUrl}/${org}/_apis/projects?api-version=7.1-preview.4`;

        // Handle Legacy visualstudio.com
        if (cleanBaseUrl.includes('visualstudio.com')) {
            url = `${cleanBaseUrl}/_apis/projects?api-version=7.1-preview.4`;
        }

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { value: ADOProject[] };
                return data.value;
            }
        } catch (err) {
            console.error('❌ [ADO] Failed to fetch projects:', err);
        }
        return [];
    }

    /**
     * Fetch Repository by ID (Global Org Scope)
     */
    static async fetchRepoById(org: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADORepo> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const url = isLegacy
            ? `${cleanBaseUrl}/_apis/git/repositories/${repoId}?api-version=7.1-preview.1`
            : `${cleanBaseUrl}/${org}/_apis/git/repositories/${repoId}?api-version=7.1-preview.1`;
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

        const response = await fetch(url, { headers: { 'Authorization': authHeader } });
        if (!response.ok) throw new Error(`Failed to fetch repo ${repoId}: ${response.statusText}`);
        return await response.json() as ADORepo;
    }

    /**
     * Fetch All Repositories from Azure DevOps Organization (via all projects)
     */
    static async fetchADOReposAcrossProjects(org: string, projects: ADOProject[], pat: string, baseUrl: string = 'https://dev.azure.com'): Promise<ADORepo[]> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

        console.log(`🔍 [ADO] Starting organization-wide repository crawl across ${projects.length} projects...`);

        // Fetch in parallel for speed
        const projectResults = await Promise.all(projects.map(async (project) => {
            try {
                let url = `${cleanBaseUrl}/${org}/${project.name}/_apis/git/repositories?api-version=7.1-preview.1`;
                if (cleanBaseUrl.includes('visualstudio.com')) {
                    url = `${cleanBaseUrl}/${project.name}/_apis/git/repositories?api-version=7.1-preview.1`;
                }
                const response = await fetch(url, { headers: { 'Authorization': authHeader } });

                if (response.ok) {
                    const data = await response.json() as { value: ADORepo[] };
                    return data.value;
                }
            } catch (err) {
                console.warn(`⚠️ [ADO] Error fetching repos for ${project.name}`);
            }
            return [];
        }));

        return projectResults.flat();
    }

    /**
     * Fetch Pipelines for a specific repository
     */
    static async fetchADOPipelines(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADOPipeline[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;
        let url = `${urlBase}/_apis/pipelines?api-version=7.1-preview.1`;
        if (repoId) url += `&repositoryId=${repoId}&repositoryType=azureRepo`;

        console.log(`      🌐 [Request] ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            const text = await response.text();

            if (response.ok) {
                try {
                    const data = JSON.parse(text) as { value: ADOPipeline[] };
                    return data.value || [];
                } catch (e) {
                    console.warn(`      ⚠️  Failed to parse JSON response. Content: ${text.substring(0, 200)}...`);
                }
            } else {
                console.warn(`      ⚠️  HTTP ${response.status}: ${text.substring(0, 100)}...`);
            }
        } catch (err) {
            console.error(`      ❌ Network Error:`, err);
        }
        return [];
    }

    /**
     * Fetch Build Definitions (Fallback for Pipelines API)
     */
    static async fetchADOBuildDefinitions(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADOPipeline[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;
        let url = `${urlBase}/_apis/build/definitions?api-version=7.0`;
        if (repoId) url += `&repositoryId=${repoId}&repositoryType=TfsGit`;

        console.log(`      🌐 [Request] ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            const text = await response.text();

            if (response.ok) {
                try {
                    const data = JSON.parse(text) as { value: any[] };
                    return (data.value || []).map(b => ({ id: b.id, name: b.name, folder: b.path || '', url: b.url, _links: b._links }));
                } catch (e) {
                    console.warn(`      ⚠️  Failed to parse JSON response. Content: ${text.substring(0, 200)}...`);
                }
            } else {
                console.warn(`      ⚠️  HTTP ${response.status}: ${text.substring(0, 100)}...`);
            }
        } catch (err) {
            console.error(`      ❌ Network Error:`, err);
        }
        return [];
    }

    /**
     * Fetch Recent Builds (Discovery Fallback 3)
     */
    static async fetchADOBuilds(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;

        let url = `${urlBase}/_apis/build/builds?api-version=7.0&$top=10`;
        if (repoId) url += `&repositoryId=${repoId}&repositoryType=TfsGit`;

        console.log(`      🌐 [Request] ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { value: any[] };
                return data.value || [];
            }
        } catch (err: any) {
            console.error(`      ❌ [ADO Builds] Network error: ${err.message}`);
        }
        return [];
    }

    /**
     * Fetch Recent Builds for a specific Definition (Pipeline ID)
     * Richer metadata than the Runs API
     */
    static async fetchBuildsByDefinition(
        org: string,
        project: string,
        definitionId: number,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string,
        top: number = 20,
        skip: number = 0
    ): Promise<any[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;

        const url = `${urlBase}/_apis/build/builds?api-version=7.0&definitions=${definitionId}&resultFilter=succeeded&$top=${top}&$skip=${skip}`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { value: any[] };
                return data.value || [];
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch builds for definition ${definitionId}:`, err);
        }
        return [];
    }

    static async fetchLatestEnvironmentDeployment(
        org: string,
        project: string,
        definitionId: number,
        environmentName: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<any | null> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;

        // 1. Find the Environment ID for the given name (Surgical Step 1)
        // Attempt exact/API-native match first
        let envId: number | null = null;
        let envUrl = `${urlBase}/_apis/distributedtask/environments?name=${encodeURIComponent(environmentName)}&api-version=7.1-preview.1`;

        try {
            let envResp = await fetch(envUrl, { headers: { 'Authorization': authHeader } });

            // Safety check for 401/404 empty bodies
            if (!envResp.ok && (envResp.status === 401 || envResp.status === 403)) {
                console.warn(`      ⚠️ [ADO] Auth failed (${envResp.status}) for ${environmentName}. Surgical skipped.`);
                return null;
            }

            let envData: { count: number; value: any[] } = { count: 0, value: [] };
            if (envResp.ok) {
                try {
                    envData = await envResp.json() as { count: number; value: any[] };
                } catch (e) { /* ignore non-json */ }
            }

            if (envResp.ok && envData.count > 0) {
                envId = envData.value[0].id;
            } else {
                // FALLBACK: Fetch all and match case-insensitive
                console.warn(`      ⚠️ [ADO] Exact env lookup failed for '${environmentName}'. Trying case-insensitive scan...`);
                envUrl = `${urlBase}/_apis/distributedtask/environments?api-version=7.1-preview.1`;
                envResp = await fetch(envUrl, { headers: { 'Authorization': authHeader } });

                if (envResp.ok) {
                    envData = await envResp.json() as { count: number; value: any[] };
                    const targetLower = environmentName.toLowerCase().trim();
                    const match = envData.value.find((e: any) => e.name.toLowerCase().trim() === targetLower);
                    if (match) {
                        envId = match.id;
                        console.log(`      ✅ [ADO] Found case-insensitive match: '${match.name}' (ID: ${envId}) for '${environmentName}'`);
                    }
                }
            }

            if (!envId) {
                return null;
            }

            // 2. Query Deployments for this specific definition and environment (Surgical Step 2)
            const deployUrl = `${urlBase}/_apis/distributedtask/environments/${envId}/deployments?definitionId=${definitionId}&latestState=succeeded&$top=1&api-version=7.1-preview.1`;
            const deployResp = await fetch(deployUrl, { headers: { 'Authorization': authHeader } });
            if (!deployResp.ok) return null;
            const deployData = await deployResp.json() as { count: number; value: any[] };

            return deployData.count > 0 ? deployData.value[0] : null;
        } catch (err: any) {
            console.warn(`      ⚠️ [ADO] Surgical environment lookup failed for ${environmentName}: ${err.message}`);
        }
        return null;
    }

    /**
     * Efficiently scans build history for multiple stages in one pass.
     * Continues scanning until all requested stages are found OR a max limit (100 builds) is reached.
     */
    static async fetchLatestStageResults(
        org: string,
        project: string,
        definitionId: number,
        stageNames: string[],
        pat: string,
        baseUrl: string = 'https://dev.azure.com'
    ): Promise<Record<string, { hash: string; date: string }>> {
        const results: Record<string, { hash: string; date: string }> = {};
        const remainingStages = new Set(stageNames.map(s => s.toLowerCase()));

        console.log(`      🔎 [Deep Scan] Searching for stages: [${stageNames.join(', ')}] in Pipeline ${definitionId}...`);

        const pageSize = 20;
        const maxBuilds = 100;

        try {
            for (let offset = 0; offset < maxBuilds && remainingStages.size > 0; offset += pageSize) {
                const builds = await this.fetchBuildsByDefinition(org, project, definitionId, pat, baseUrl, undefined, pageSize, offset);
                if (builds.length === 0) break;

                console.log(`      ⏳ [Deep Scan] Scanning builds ${offset + 1} to ${offset + builds.length}...`);

                for (const build of builds) {
                    const timeline = await this.fetchPipelineRunTimeline(org, project, build.id, pat, baseUrl);
                    if (!timeline) continue;

                    // Check each remaining stage against this build's timeline
                    for (const stageName of Array.from(remainingStages)) {
                        const stage = timeline.find(r =>
                            r.type?.toLowerCase() === 'stage' &&
                            r.name?.toLowerCase().includes(stageName) &&
                            r.status?.toLowerCase() === 'completed' &&
                            r.result?.toLowerCase() === 'succeeded'
                        );

                        if (stage) {
                            results[stageName.toUpperCase()] = {
                                hash: build.sourceVersion || 'unknown',
                                date: stage.finishTime || build.finishTime
                            };
                            remainingStages.delete(stageName);
                            console.log(`      ✅ [HIT] Found ${stageName.toUpperCase()} in Build ${build.id} (${build.sourceVersion?.substring(0, 7)})`);
                        }
                    }

                    if (remainingStages.size === 0) break;
                }
            }

            if (remainingStages.size > 0) {
                console.log(`      ⚠️  [Deep Scan] Could not find remaining stages: [${Array.from(remainingStages).join(', ')}] after ${maxBuilds} builds.`);
            }
        } catch (err: any) {
            console.error(`      ❌ [Deep Scan] Critical error: ${err.message}`);
        }

        return results;
    }

    /**
     * Legacy single-stage wrapper for backward compatibility.
     */
    static async fetchLatestStageResult(
        org: string,
        project: string,
        definitionId: number,
        stageName: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com'
    ): Promise<{ hash: string; date: string } | null> {
        const results = await this.fetchLatestStageResults(org, project, definitionId, [stageName], pat, baseUrl);
        return results[stageName.toUpperCase()] || null;
    }
    static async fetchPipelineRuns(org: string, project: string, pipelineId: number, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<PipelineRun[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');

        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;
        const url = `${urlBase}/_apis/pipelines/${pipelineId}/runs?api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { value: PipelineRun[] };
                return data.value;
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch runs for pipeline ${pipelineId}:`, err);
        }
        return [];
    }

    /**
     * Fetch Timeline for a specific Pipeline Run
     */
    static async fetchPipelineRunTimeline(org: string, project: string, runId: number, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<TimelineRecord[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');

        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;
        // Standard ADO builds/timeline endpoint
        const url = `${urlBase}/_apis/build/builds/${runId}/timeline?api-version=7.1-preview.2`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { records: TimelineRecord[] };
                return data.records;
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch timeline for run ${runId}:`, err);
        }
        return [];
    }

    /**
     * Get MS Graph access token using Azure CLI
     */
    static async getGraphAccessToken(): Promise<string> {
        try {
            const token = execSync('az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv', {
                encoding: 'utf-8'
            }).trim();
            return token;
        } catch (error) {
            console.warn('⚠️ Could not get Graph Token. Ensure "az login" has permissions.');
            return '';
        }
    }

    /**
     * Fetch Transitive Groups for the logged-in User
     */
    /**
     * Fetch Transitive Groups for the logged-in User
     */
    static async fetchUserGroups(): Promise<AzureADGroup[]> {
        const token = await this.getGraphAccessToken();
        if (!token) return [];

        console.log('🔗 Fetching Azure AD Groups for current user...');
        const allGroups: AzureADGroup[] = [];
        let nextLink: string | null = 'https://graph.microsoft.com/v1.0/me/transitiveMemberOf/microsoft.graph.group?$select=id,displayName,description,mail';

        try {
            while (nextLink) {
                const response = await fetch(nextLink, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json() as { value: any[], '@odata.nextLink'?: string };
                    const pageGroups = data.value.map(g => ({
                        id: g.id,
                        displayName: g.displayName,
                        description: g.description,
                        mail: g.mail
                    }));

                    allGroups.push(...pageGroups);
                    console.log(`  Fetched ${pageGroups.length} groups... (Total: ${allGroups.length})`);

                    nextLink = data['@odata.nextLink'] || null;
                } else {
                    console.warn(`⚠️ Graph API Error: ${response.status} ${response.statusText}`);
                    nextLink = null;
                }
            }

            console.log(`✅ Total AD Groups Found: ${allGroups.length}`);
            return allGroups;

        } catch (err) {
            console.error('❌ Failed to fetch user groups:', err);
        }
        return [];
    }

    /**
     * Fetch App Registrations by Client ID (App ID)
     * Handles batching naively for this script (sequential or small checks)
     */
    static async fetchAppRegistrations(appIds: string[]): Promise<AppRegistration[]> {
        const token = await this.getGraphAccessToken();
        if (!token || appIds.length === 0) return [];

        console.log(`🔍 Resolving ${appIds.length} Client IDs via Graph...`);
        const results: AppRegistration[] = [];

        // Determine names via Graph
        for (const appId of appIds) {
            try {
                // Skip if not a GUID (e.g. keyVault URL)
                if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(appId)) continue;

                const response = await fetch(`https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${appId}'&$select=appId,displayName,identifierUris`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json() as { value: any[] };
                    if (data.value && data.value.length > 0) {
                        const app = data.value[0];
                        results.push({
                            appId: app.appId,
                            displayName: app.displayName,
                            appIdUri: app.identifierUris && app.identifierUris.length > 0 ? app.identifierUris[0] : undefined
                        });
                    }
                }
            } catch (err) {
                console.warn(`  ⚠️ Failed to resolve AppId ${appId}`);
            }
        }

        return results;
    }

    /**
     * Search for Code in ADO (TF match strategy)
     */
    static async searchCode(org: string, searchTerm: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<CodeSearchResponse> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;

        // Determine Search URL
        // DEV.AZURE.COM & VISUALSTUDIO.COM -> Use almsearch sub-domain for REST API
        let searchOrg = org;
        if (cleanBaseUrl.includes('visualstudio.com')) {
            const match = cleanBaseUrl.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
            if (match) searchOrg = match[1];
        }

        const searchUrl = `https://almsearch.dev.azure.com/${searchOrg}/_apis/search/codesearchresults?api-version=7.1-preview.1`;

        const body: any = {
            searchText: searchTerm,
            $top: 20
        };

        try {
            const response = await fetch(searchUrl, {
                method: 'POST',
                headers: {
                    'Authorization': authHeader,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                return await response.json() as CodeSearchResponse;
            } else {
                const txt = await response.text();
                console.warn(`⚠️ [ADO Search] Failed: ${response.status} ${response.statusText}`, txt);
            }
        } catch (err) {
            console.error('❌ [ADO Search] Network Warning:', err);
        }
        return { count: 0, results: [] };
    }
    /**
     * Fetch Items (Files/Folders) from a Repository
     * Used for "File Crawler" to find OpenAPI specs
     */
    static async fetchRepoItems(
        org: string,
        project: string,
        repoId: string,
        pat: string,
        scopePath: string = '/',
        recursionLevel: 'OneLevel' | 'Full' = 'Full',
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<any[]> {
        const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const isLegacy = cleanBaseUrl.includes('visualstudio.com');
        const urlBase = isLegacy ? `${cleanBaseUrl}/${project}` : `${cleanBaseUrl}/${org}/${project}`;

        const url = `${urlBase}/_apis/git/repositories/${repoId}/items?scopePath=${scopePath}&recursionLevel=${recursionLevel}&includeContentMetadata=true&api-version=7.1-preview.1`;

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { count: number, value: any[] };
                return data.value || [];
            } else {
                console.warn(`      ⚠️  [Repo Items] Failed ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            console.error(`      ❌ [Repo Items] Network Error:`, err);
        }
        return [];
    }
}

export interface AzureADGroup {
    id: string;
    displayName: string;
    description?: string;
    mail?: string;
}

export interface AppRegistration {
    appId: string;
    displayName: string;
    appIdUri?: string;
}
