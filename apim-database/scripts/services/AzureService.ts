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
    project?: { name: string; id: string };
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
    sourceBranch: string;
    sourceVersion: string;
    requestedFor: {
        displayName: string;
        imageUrl: string;
    };
    triggerInfo?: {
        "ci.message"?: string;
    };
    project?: { name: string; id: string };
    _links: {
        web: { href: string };
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

export interface ADOReleaseDefinition {
    id: number;
    name: string;
    path: string;
    url: string;
    _links: { web: { href: string } };
}

export interface ADORelease {
    id: number;
    name: string;
    status: string;
    createdOn: string;
    modifiedOn: string;
    createdBy: {
        displayName: string;
    };
    project?: { name: string; id: string };
    environments: {
        id: number;
        name: string;
        status: string;
        deploySteps: {
            queuedOn: string;
            status: string;
        }[];
    }[];
    artifacts: {
        alias: string;
        definitionReference: {
            version: { id: string; name: string };
            branch: { id: string; name: string };
        };
    }[];
    _links: {
        web: { href: string };
    };
}

export class AzureService {
    static async getAzureAccessToken(resource: string = 'https://management.azure.com'): Promise<string> {
        try {
            // On Windows, inherit full environment to ensure 'az' is in PATH
            const token = execSync(`az account get-access-token --resource ${resource} --query accessToken -o tsv`, {
                encoding: 'utf-8',
                env: { ...process.env },
                shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
                stdio: ['ignore', 'pipe', 'pipe']
            }).trim();

            if (!token || token.length < 10) {
                throw new Error('Azure CLI returned empty or invalid token');
            }
            return token;
        } catch (error: any) {
            const errorMsg = error.stderr?.toString() || error.stdout?.toString() || error.message || 'Unknown error';
            throw new Error(`Failed to get Azure access token for ${resource}. ${errorMsg}. Ensure 'az login' was successful.`);
        }
    }

    /**
     * Get Azure DevOps access token dynamically using Azure CLI
     * Uses the az devops extension to get token without hardcoded resource IDs
     */
    static async getAdoAccessToken(): Promise<string> {
        try {
            // Try using az devops login to get token (requires az devops extension)
            const token = execSync(`az account get-access-token --resource 499b84a3-100d-4558-8351-c1e149307c81 --query accessToken -o tsv`, {
                encoding: 'utf-8',
                env: { ...process.env },
                shell: process.platform === 'win32' ? 'cmd.exe' : undefined,
                stdio: ['ignore', 'pipe', 'pipe']
            }).trim();

            if (!token || token.length < 10) {
                throw new Error('Azure CLI returned empty or invalid ADO token');
            }
            return token;
        } catch (error: any) {
            const errorMsg = error.stderr?.toString() || error.stdout?.toString() || error.message || 'Unknown error';
            throw new Error(`Failed to get Azure DevOps access token. ${errorMsg}. Ensure 'az login' was successful.`);
        }
    }

    static getAuthHeader(pat: string, bearerToken?: string): string {
        if (bearerToken) return `Bearer ${bearerToken}`;
        return `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
    }

    /**
     * Standardizes the ADO Base URL to handle legacy and modern formats.
     * Always returns the root instance URL (e.g., https://dev.azure.com or https://org.visualstudio.com)
     */
    static getAdoInstanceUrl(baseUrl: string, org: string): string {
        let cleanBase = baseUrl.replace(/\/+$/, '');
        const cleanOrg = org.replace(/\/+$/, '');

        // If it's a visualstudio.com URL, we assume it's already Correct (e.g. https://org.visualstudio.com)
        if (cleanBase.toLowerCase().includes('visualstudio.com')) {
            return cleanBase;
        }

        // For dev.azure.com, we return the base instance https://dev.azure.com
        // We will append the org in sub-methods as needed.
        if (cleanBase.toLowerCase().includes('dev.azure.com')) {
            const match = cleanBase.match(/https?:\/\/dev\.azure\.com/i);
            if (match) return match[0];
        }

        return cleanBase;
    }

    /**
     * Gets the full Organization URL (e.g., https://dev.azure.com/org or https://org.visualstudio.com)
     */
    static getAdoOrgUrl(baseUrl: string, org: string): string {
        const cleanBase = baseUrl.replace(/\/+$/, '');
        const lowerBase = cleanBase.toLowerCase();
        const lowerOrg = org.toLowerCase();

        // If it's a visualstudio.com URL, it usually has the org in the subdomain
        if (lowerBase.includes('visualstudio.com')) {
            return cleanBase;
        }

        // If the baseUrl already ends with /org, don't append it again
        if (lowerBase.endsWith(`/${lowerOrg}`)) {
            return cleanBase;
        }

        // For dev.azure.com, we want https://dev.azure.com/org
        // If cleanBase is just https://dev.azure.com, append org
        if (lowerBase === 'https://dev.azure.com' || lowerBase === 'http://dev.azure.com') {
            return `${cleanBase}/${org}`;
        }

        // Otherwise, if it doesn't contain the org, append it
        if (!lowerBase.includes(`/${lowerOrg}/`) && !lowerBase.endsWith(`/${lowerOrg}`)) {
            return `${cleanBase}/${org}`;
        }

        return cleanBase;
    }

    static getAdoSearchUrl(baseUrl: string, org: string): string {
        const cleanBase = baseUrl.replace(/\/+$/, '').toLowerCase();

        // Handle Legacy: https://org.visualstudio.com -> https://org.almsearch.visualstudio.com
        if (cleanBase.includes('visualstudio.com')) {
            const subdomainMatch = cleanBase.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
            const searchOrg = subdomainMatch ? subdomainMatch[1] : org;
            return `https://${searchOrg}.almsearch.visualstudio.com/_apis/search/codesearchresults?api-version=7.1`;
        }

        // Handle Modern: https://dev.azure.com/org -> https://almsearch.dev.azure.com/org
        return `https://almsearch.dev.azure.com/${org}/_apis/search/codesearchresults?api-version=7.1`;
    }

    /**
     * Gets the Release API URL (vrm)
     */
    static getAdoReleaseUrl(baseUrl: string, org: string, project: string): string {
        const cleanBase = baseUrl.replace(/\/+$/, '').toLowerCase();

        // Handle Legacy: https://org.visualstudio.com -> https://org.vsrm.visualstudio.com
        if (cleanBase.includes('visualstudio.com')) {
            const subdomainMatch = cleanBase.match(/https?:\/\/([^.]+)\.visualstudio\.com/);
            const releaseOrg = subdomainMatch ? subdomainMatch[1] : org;
            return `https://${releaseOrg}.vsrm.visualstudio.com/${encodeURIComponent(project)}`;
        }

        // Handle Modern: https://dev.azure.com/org -> https://vsrm.dev.azure.com/org
        return `https://vsrm.dev.azure.com/${org}/${encodeURIComponent(project)}`;
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        const url = `${urlBase}/_apis/git/repositories/${repoId}/items?scopePath=${scopePath}&recursionLevel=${recursionLevel}&includeContentMetadata=true`;

        // console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
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

    /**
     * Fetch File Content from a Repository
     */
    static async fetchFileContent(org: string, repoId: string, scopePath: string, pat: string, recursionLevel: string = 'None', baseUrl: string = 'https://dev.azure.com'): Promise<any> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat);
        const url = `${orgUrl}/_apis/git/repositories/${repoId}/items?scopePath=${scopePath}&recursionLevel=${recursionLevel}&includeContentMetadata=true`;

        // console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json'
                }
            });
            // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                return await response.text(); // Return raw text content
            } else {
                console.warn(`      ⚠️  [File Content] Failed ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            console.error(`      ❌ [File Content] Network Error:`, err);
        }
        return null;
    }

    /**
     * Verifies the ADO connection and retrieves identity information.
     */
    static async verifyAdoConnection(org: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const url = `${orgUrl}/_apis/connectionData`;

        // console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (!response.ok) {
                const txt = await response.text();
                console.error(`❌ [ADO] Auth Failed (${response.status}):`, txt.substring(0, 200));
                throw new Error(`ADO Authentication failed (${response.status}): ${txt.substring(0, 100)}`);
            }
            return await response.json();
        } catch (err: any) {
            console.error(`❌ [ADO] Connection failed: ${err.message}`);
            throw err; // Re-throw the error as the original method did
        }
    }

    /**
     * Joins ADO URL segments safely.
     */
    static getVstsUrl(baseUrl: string, org: string, project: string, subPath: string): string {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const cleanPath = subPath.replace(/^\/+/, '');
        return `${orgUrl}/${encodeURIComponent(project)}/${cleanPath}`;
    }

    /**
     * Fetch data from APIM REST API with pagination support
     */
    static async fetchAPIM<T>(config: APIMConfig, path: string): Promise<{ value: T[] }> {
        const results: T[] = [];
        const baseUrl = `https://management.azure.com/subscriptions/${config.subscriptionId}/resourceGroups/${config.resourceGroup}/providers/Microsoft.ApiManagement/service/${config.instance}`;
        let nextLink: string | null = `${baseUrl}${path}?api-version=2022-08-01`;

        while (nextLink) {
            console.log(`📡 [APIM Request] GET ${nextLink}`);
            const response = await fetch(nextLink, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`📡 [APIM Response] ${response.status} ${response.statusText}`);

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
            const url = `https://management.azure.com${productId}/tags?api-version=2022-08-01`;
            console.log(`📡 [APIM Request] GET ${url}`);
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${config.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });
            console.log(`📡 [APIM Response] ${response.status} ${response.statusText}`);

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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat);
        const url = `${orgUrl}/_apis/projects?api-version=7.1`;

        // console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json() as { value: ADOProject[] };
                return data.value;
            } else {
                const txt = await response.text();
                console.error(`❌ [ADO] Project Fetch Failed (${response.status}):`, txt.substring(0, 100));
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const url = `${orgUrl}/_apis/git/repositories/${repoId}`;
        const authHeader = this.getAuthHeader(pat, bearerToken);

        // console.log(`📡 [ADO Request] GET ${url}`);
        const response = await fetch(url, { headers: { 'Authorization': authHeader } });
        // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const txt = await response.text();
            throw new Error(`Failed to fetch repo ${repoId} (${response.status}): ${txt.substring(0, 100)}`);
        }
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const projectResults = await Promise.all(projects.map(async (project) => {
            try {
                const url = `${orgUrl}/${encodeURIComponent(project.name)}/_apis/git/repositories`;
                // console.log(`📡 [ADO Request] GET ${url}`);
                const response = await fetch(url, { headers: { 'Authorization': authHeader } });
                // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);

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
     * NOTE: This API endpoint does NOT properly filter by repositoryId - returns all project pipelines
     * Use fetchADOBuildDefinitions instead which DOES filter correctly
     */
    static async fetchADOPipelines(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADOPipeline[]> {
        console.log(`   ⚠️  Skipping Pipelines API - it doesn't filter by repository (would return all ${391}+ project pipelines)`);
        console.log(`   ℹ️  Using Build Definitions API instead (proper repository filtering)`);
        return [];
    }

    /**
     * Fetch Release Definitions (Classic Pipelines)
     */
    static async fetchADOReleaseDefinitions(org: string, project: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADOPipeline[]> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const releaseBase = this.getAdoReleaseUrl(baseUrl, org, project);
        const url = `${releaseBase}/_apis/release/definitions?$top=100`;
        // console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            // console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json() as { value: any[] };
                return data.value.map(r => ({
                    id: r.id,
                    name: r.name,
                    folder: r.path || '',
                    url: r.url,
                    project: r.project, // Preservation
                    _links: r._links
                }));
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch release definitions:`, err);
        }
        return [];
    }

    /**
     * Fetch Latest Releases for a definition
     */
    static async fetchADOReleases(org: string, project: string, definitionId: number, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<ADORelease[]> {
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const releaseBase = this.getAdoReleaseUrl(baseUrl, org, project);
        const url = `${releaseBase}/_apis/release/releases?definitionId=${definitionId}&$top=20`;

        console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json() as { value: ADORelease[] };
                return data.value || [];
            }
        } catch (err) { }
        return [];
    }

    /**
     * Fetch Build Definitions (Fallback for Pipelines API)
     */
    static async fetchADOBuildDefinitions(
        org: string,
        project: string,
        repoId: string | undefined,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string,
        repoName?: string
    ): Promise<ADOPipeline[]> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        const params = new URLSearchParams({ 'api-version': '7.1' });
        if (repoId) {
            params.append('repositoryId', repoId);
            params.append('repositoryType', 'TfsGit');
        }
        if (repoName) {
            params.append('name', repoName);
        }

        const url = `${urlBase}/_apis/build/definitions?${params.toString()}`;

        console.log(`📡 [ADO Request] Build Definitions GET ${url}`);
        if (repoId) console.log(`   🎯 Filter: repositoryId=${repoId}, repositoryType=TfsGit`);
        if (repoName) console.log(`   🎯 Filter: name=${repoName}`);

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            const text = await response.text();

            if (response.ok) {
                try {
                    const data = JSON.parse(text) as { value: any[] };
                    return (data.value || []).map(b => ({
                        id: b.id,
                        name: b.name,
                        folder: b.path || '',
                        url: b.url,
                        _links: b._links,
                        repositoryId: repoId // Tag for validation
                    }));
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
     * Fetch a specific build by ID
     */
    static async fetchADOBuild(org: string, project: string, buildId: number, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/build/builds/${buildId}`;
        console.log(`📡 [ADO Request] Build Details GET ${url}`);

        try {
            const resp = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${resp.status} ${resp.statusText}`);
            if (resp.ok) return await resp.json();
        } catch (e) {
            console.error(`❌ [ADO] Failed to fetch build ${buildId}:`, e);
        }
        return null;
    }

    /**
     * Fetch Recent Builds (Discovery Fallback 3)
     */
    static async fetchADOBuilds(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any[]> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        // Use the rawest possible URL to match user's successful browser tests
        let url = `${urlBase}/_apis/build/builds?$top=50&queryOrder=finishTimeDescending`;
        if (repoId) url += `&repositoryId=${repoId}&repositoryType=TfsGit`;

        console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        // Synchronize versions and ensure no strict result filter (the caller filters locally)
        const url = `${urlBase}/_apis/build/builds?definitions=${definitionId}&$top=${top}&$skip=${skip}&queryOrder=finishTimeDescending`;

        console.log(`📡 [ADO Request] Build List (By Definition) GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json() as { value: any[] };
                return data.value || [];
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch builds for definition ${definitionId}:`, err);
        }
        return [];
    }

    /**
     * SURGICAL: Discover active pipelines for a repository by analyzing recent builds
     * This is the most reliable way to find pipelines that actually build a specific repository
     */
    static async fetchPipelinesByRepositoryBuilds(
        org: string,
        project: string,
        repoId: string,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<ADOPipeline[]> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        // Query recent builds for this repository
        const url = `${urlBase}/_apis/build/builds?repositoryId=${repoId}&repositoryType=TfsGit&$top=100&api-version=7.1`;

        console.log(`📡 [ADO Request] GET ${url}`);
        console.log(`   🎯 Surgical: Finding pipelines via build history for repository`);

        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json() as { value: any[] };
                const builds = data.value || [];
                console.log(`   📊 Found ${builds.length} recent builds for repository`);

                if (builds.length === 0) {
                    console.log(`   ⚠️  No builds found for this repository`);
                    return [];
                }

                // Extract unique pipeline definitions from builds
                const pipelineMap = new Map<number, ADOPipeline>();

                builds.forEach((build: any) => {
                    if (build.definition && build.definition.id) {
                        const defId = build.definition.id;
                        if (!pipelineMap.has(defId)) {
                            pipelineMap.set(defId, {
                                id: defId,
                                name: build.definition.name,
                                folder: build.definition.path || '',
                                url: build.definition.url,
                                project: build.definition.project || build.project,
                                _links: build.definition._links || { web: { href: `${baseUrl}/${org}/${project}/_build?definitionId=${defId}` } }
                            });
                        }
                    }
                });

                const pipelines = Array.from(pipelineMap.values());
                console.log(`   ✅ Discovered ${pipelines.length} unique active pipeline(s) from build history:`);
                pipelines.forEach(p => console.log(`      - ${p.name} (ID: ${p.id})`));

                return pipelines;
            } else {
                const errorText = await response.text();
                console.error(`   ❌ Failed to fetch builds: ${response.status} ${response.statusText}`);
                console.error(`   Error: ${errorText.substring(0, 200)}`);
            }
        } catch (err: any) {
            console.error(`   ❌ Network error: ${err.message}`);
        }

        return [];
    }

    /**
     * Fetch the LATEST SUCCESSFUL build for a specific Pipeline Definition
     * Uses server-side filtering for efficiency - no local filtering needed!
     * 
     * @returns Build object with full details including:
     *   - sourceVersion (commit hash)
     *   - sourceBranch
     *   - requestedFor (author)
     *   - resources.repositories (multi-repo builds)
     *   - project (pipeline's project context)
     */
    static async fetchLatestSuccessfulBuild(
        org: string,
        project: string,
        definitionId: number,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<any | null> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        // Server-side filtering: only succeeded, completed, sorted by finish time, top 1
        const url = `${urlBase}/_apis/build/builds?definitions=${definitionId}&resultFilter=succeeded&statusFilter=completed&$top=1&queryOrder=finishTimeDescending&api-version=7.1`;

        console.log(`📡 [ADO Request] Latest Successful Build GET ${url}`);
        try {
            const response = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);

            if (response.ok) {
                const data = await response.json() as { count?: number; value: any[] };
                if (data.value && data.value.length > 0) {
                    const build = data.value[0];
                    console.log(`      ✅ Found latest successful build: ID ${build.id}, Commit ${build.sourceVersion?.substring(0, 7) || 'N/A'}`);
                    return build;
                } else {
                    console.warn(`      ⚠️  No successful builds found for definition ${definitionId} in project ${project}.`);
                    return null;
                }
            } else {
                const errorText = await response.text();
                console.error(`      ❌ Failed to fetch latest successful build (${response.status}): ${errorText.substring(0, 200)}`);
                return null;
            }
        } catch (err: any) {
            console.error(`      ❌ [ADO] Network error fetching latest successful build: ${err.message}`);
            return null;
        }
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;

        // 1. Find the Environment ID for the given name (Surgical Step 1)
        let envId: number | null = null;
        let envUrl = `${urlBase}/_apis/distributedtask/environments?name=${encodeURIComponent(environmentName)}`;

        console.log(`📡 [ADO Request] GET ${envUrl}`);

        try {
            let envResp = await fetch(envUrl, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            console.log(`📡 [ADO Response] ${envResp.status} ${envResp.statusText}`);

            if (!envResp.ok && (envResp.status === 401 || envResp.status === 403)) {
                console.warn(`      ⚠️ [ADO] Auth failed (${envResp.status}) for ${environmentName}. Surgical lookup skipped.`);
                return null;
            }

            let envData: { count: number; value: any[] } = { count: 0, value: [] };
            if (envResp.ok) {
                try {
                    envData = await envResp.json() as { count: number; value: any[] };
                } catch (e) { }
            }

            if (envResp.ok && envData.count > 0) {
                envId = envData.value[0].id;
            } else {
                // FALLBACK: Fetch all and match case-insensitive
                console.warn(`      ⚠️ [ADO] Exact env lookup failed. Trying case-insensitive scan...`);
                envUrl = `${urlBase}/_apis/distributedtask/environments`;
                console.log(`📡 [ADO Request] GET ${envUrl} (Fallback)`);
                envResp = await fetch(envUrl, {
                    headers: {
                        'Authorization': authHeader,
                        'Accept': 'application/json',
                        'X-TFS-FedAuthRedirect': 'Suppress'
                    }
                });
                if (envResp.ok) {
                    envData = await envResp.json() as { count: number; value: any[] };
                    const targetLower = environmentName.toLowerCase().trim();
                    const match = envData.value.find((e: any) => e.name.toLowerCase().trim() === targetLower);
                    if (match) {
                        envId = match.id;
                        console.log(`      ✅ Found match: '${match.name}' (ID: ${envId})`);
                    }
                }
            }

            if (!envId) {
                console.warn(`      ⚠️ [ADO] Environment '${environmentName}' not found in project ${project}.`);
                return null;
            }

            // 2. Query Deployments for this specific definition and environment (Surgical Step 2)
            const tryFetch = async (endpoint: string) => {
                const url = `${urlBase}/_apis/distributedtask/environments/${envId}/${endpoint}`;
                console.log(`📡 [ADO Request] GET ${url}`);
                const resp = await fetch(url, { headers: { 'Authorization': authHeader, 'Accept': 'application/json', 'X-TFS-FedAuthRedirect': 'Suppress' } });
                console.log(`📡 [ADO Response] ${resp.status} ${resp.statusText}`);
                if (resp.ok) return await resp.json();
                return null;
            };

            let deployData = await tryFetch(`deployments?definitionId=${definitionId}&latestState=succeeded&$top=1`);

            if (!deployData || deployData.count === 0) {
                console.warn(`      ⚠️  Surgical strike with definitionId ${definitionId} failed. Trying broader environment scan...`);
                deployData = await tryFetch(`deployments?$top=50`);
                if (!deployData || deployData.count === 0) {
                    deployData = await tryFetch(`environmentdeploymentrecords?$top=50`);
                }
            }

            if (deployData && deployData.count > 0) {
                // Locally filter for definitionId and success
                const match = deployData.value.find((d: any) =>
                    (Number(d.definitionId) === Number(definitionId) ||
                        Number(d.owner?.definition?.id) === Number(definitionId) ||
                        Number(d.definition?.id) === Number(definitionId)) &&
                    (['succeeded', 'partiallysucceeded'].includes((d.status || '').toLowerCase()) ||
                        ['succeeded', 'partiallysucceeded'].includes((d.result || '').toLowerCase()))
                );

                if (match) {
                    console.log(`      ✅ Found matching deployment! (Build ID: ${match.owner?.id || match.id})`);

                    // Ensure project info is captured if present in the record
                    if (!match.project && (match.owner?.project || match.definition?.project)) {
                        match.project = match.owner?.project || match.definition?.project;
                    }

                    // If the deployment object doesn't have the build/hash details, try to fetch the owner build
                    if (!match.build?.sourceVersion && (match.owner?.id || match.id)) {
                        const buildId = match.owner?.id || match.id;
                        const buildProject = match.project?.id || match.project?.name || project;
                        console.log(`      📡 Fetching supplementary build details (ID: ${buildId}) from project ${buildProject}...`);
                        const fullBuild = await this.fetchADOBuild(org, buildProject, buildId, pat, baseUrl, bearerToken);
                        if (fullBuild) match.build = fullBuild;
                    }
                    return match;
                }
            }

            return null;
        } catch (err: any) {
            console.error(`      ❌ [ADO] Surgical environment lookup failed: ${err.message}`);
            return null;
        }
    }

    /**
     * Broadly fetch recent deployments for an environment (no definition filter)
     */
    static async fetchEnvironmentDeployments(
        org: string,
        project: string,
        envId: number,
        pat: string,
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string,
        top: number = 20
    ): Promise<any[]> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const url = `${orgUrl}/${encodeURIComponent(project)}/_apis/distributedtask/environments/${envId}/environmentdeploymentrecords?$top=${top}`;

        console.log(`📡 [ADO Request] GET ${url}`);
        try {
            const resp = await fetch(url, {
                headers: {
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                    'X-TFS-FedAuthRedirect': 'Suppress'
                }
            });
            if (resp.ok) {
                const data = await resp.json() as { value: any[] };
                return data.value || [];
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch environment deployments:`, err);
        }
        return [];
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
        baseUrl: string = 'https://dev.azure.com',
        bearerToken?: string
    ): Promise<Record<string, { hash: string; date: string; buildId?: number }>> {
        const results: Record<string, { hash: string; date: string; buildId?: number }> = {};
        const remainingStages = new Set(stageNames.map(s => s.toLowerCase()));
        const authHeader = this.getAuthHeader(pat, bearerToken);

        console.log(`      🔎 [Deep Scan] Searching for stages: [${stageNames.join(', ')}] in Pipeline ${definitionId}...`);

        const pageSize = 20;
        const maxBuilds = 100;

        try {
            for (let offset = 0; offset < maxBuilds && remainingStages.size > 0; offset += pageSize) {
                const builds = await this.fetchBuildsByDefinition(org, project, definitionId, pat, baseUrl, bearerToken, pageSize, offset);
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
                                date: stage.finishTime || build.finishTime,
                                buildId: build.id
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
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;
        const url = `${urlBase}/_apis/pipelines/${pipelineId}/runs`;
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

        for (const appId of appIds) {
            try {
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
    static async searchCode(org: string, query: string, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any> {
        const url = this.getAdoSearchUrl(baseUrl, org);
        const authHeader = bearerToken ? `Bearer ${bearerToken}` : `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        const requestBody = { searchText: query, $top: 50 };

        console.log(`📡 [ADO Request] POST ${url}`);
        console.log(`📤 [Request Body]:`, JSON.stringify(requestBody, null, 2));

        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);

        if (!response.ok) {
            const txt = await response.text();
            console.error(`❌ [ADO] Search Failed: ${txt.substring(0, 100)}`);
            return { count: 0, results: [] };
        }

        const data = await response.json();
        console.log(`📥 [Response Data]: ${data.count || 0} results`);

        return data;
    }

    /**
     * Fetch Timeline for a specific Pipeline Run
     */
    static async fetchPipelineRunTimeline(org: string, project: string, runId: number, pat: string, baseUrl: string = 'https://dev.azure.com', bearerToken?: string): Promise<any[]> {
        const orgUrl = this.getAdoOrgUrl(baseUrl, org);
        const authHeader = this.getAuthHeader(pat, bearerToken);
        const urlBase = `${orgUrl}/${encodeURIComponent(project)}`;
        const url = `${urlBase}/_apis/build/builds/${runId}/timeline`;

        console.log(`📡 [ADO Request] Timeline GET ${url}`);
        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            console.log(`📡 [ADO Response] ${response.status} ${response.statusText}`);
            if (response.ok) {
                const data = await response.json() as { records: any[] };
                return data.records;
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch timeline for run ${runId}:`, err);
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
