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

export class AzureService {
    /**
     * Get Azure access token using Azure CLI
     */
    static async getAzureAccessToken(): Promise<string> {
        try {
            const token = execSync('az account get-access-token --resource https://management.azure.com --query accessToken -o tsv', {
                encoding: 'utf-8'
            }).trim();
            return token;
        } catch (error) {
            throw new Error('Failed to get Azure access token. Make sure Azure CLI is installed and you are logged in (az login)');
        }
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
    static async fetchADOPipelines(org: string, project: string, repoId: string, pat: string, baseUrl: string = 'https://dev.azure.com'): Promise<ADOPipeline[]> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        let url = `${cleanBaseUrl}/${org}/${project}/_apis/pipelines?api-version=7.1-preview.1&repositoryId=${repoId}&repositoryType=azureRepo`;
        if (cleanBaseUrl.includes('visualstudio.com')) {
            url = `${cleanBaseUrl}/${project}/_apis/pipelines?api-version=7.1-preview.1&repositoryId=${repoId}&repositoryType=azureRepo`;
        }

        try {
            const response = await fetch(url, { headers: { 'Authorization': authHeader } });
            if (response.ok) {
                const data = await response.json() as { value: ADOPipeline[] };
                return data.value;
            }
        } catch (err) {
            console.error(`❌ [ADO] Failed to fetch pipelines for repo ${repoId}:`, err);
        }
        return [];
    }

    /**
     * Fetch Recent Runs for a Pipeline
     */
    static async fetchPipelineRuns(org: string, project: string, pipelineId: number, pat: string, baseUrl: string = 'https://dev.azure.com'): Promise<PipelineRun[]> {
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const authHeader = `Basic ${Buffer.from(`:${pat}`).toString('base64')}`;
        let url = `${cleanBaseUrl}/${org}/${project}/_apis/pipelines/${pipelineId}/runs?api-version=7.1-preview.1`;
        if (cleanBaseUrl.includes('visualstudio.com')) {
            url = `${cleanBaseUrl}/${project}/_apis/pipelines/${pipelineId}/runs?api-version=7.1-preview.1`;
        }

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

                const response = await fetch(`https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${appId}'&$select=appId,displayName`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                });

                if (response.ok) {
                    const data = await response.json() as { value: any[] };
                    if (data.value && data.value.length > 0) {
                        results.push({
                            appId: data.value[0].appId,
                            displayName: data.value[0].displayName
                        });
                    }
                }
            } catch (err) {
                console.warn(`  ⚠️ Failed to resolve AppId ${appId}`);
            }
        }

        return results;
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
}
