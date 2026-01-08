/**
 * Azure DevOps API POC
 * 
 * Quick test to verify we can access Azure DevOps REST API
 * 
 * Azure DevOps API Docs:
 * https://learn.microsoft.com/en-us/rest/api/azure/devops/
 * 
 * Required:
 * - Azure DevOps org (can be org name or full URL)
 * - Personal Access Token (PAT) with Code: Read scope
 * 
 * Supports both URL formats:
 * - Old: https://org.visualstudio.com
 * - New: https://dev.azure.com/org
 * 
 * Usage:
 * AZURE_DEVOPS_ORG=your-org AZURE_DEVOPS_PAT=your-pat npx tsx scripts/test-azure-devops.ts
 * OR
 * AZURE_DEVOPS_ORG=https://org.visualstudio.com AZURE_DEVOPS_PAT=your-pat npx tsx scripts/test-azure-devops.ts
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface AzureDevOpsConfig {
    organization: string;
    pat: string;
    apiVersion: string;
}

interface Repository {
    id: string;
    name: string;
    url: string;
    project: {
        name: string;
    };
}

interface SearchResult {
    count: number;
    results: Array<{
        fileName: string;
        path: string;
        repository: {
            name: string;
        };
    }>;
}

/**
 * Extract organization name from URL or return as-is
 * Handles:
 * - org-name.visualstudio.com → org-name
 * - dev.azure.com/org-name → org-name  
 * - org-name → org-name
 */
function extractOrgName(input: string): string {
    // Remove protocol if present
    const cleaned = input.replace(/^https?:\/\//, '');

    // Old format: org.visualstudio.com
    if (cleaned.includes('.visualstudio.com')) {
        return cleaned.split('.visualstudio.com')[0];
    }

    // New format: dev.azure.com/org
    if (cleaned.includes('dev.azure.com/')) {
        return cleaned.split('dev.azure.com/')[1].split('/')[0];
    }

    // Already just org name
    return cleaned.split('/')[0];
}

/**
 * Test Azure DevOps API connection
 */
async function testAzureDevOpsAPI(config: AzureDevOpsConfig) {
    const isLegacy = config.organization.includes('.visualstudio.com') || config.organization.includes('visualstudio.com');
    const cleanRepoOrg = extractOrgName(config.organization);
    const baseUrl = isLegacy
        ? `https://${cleanRepoOrg}.visualstudio.com`
        : `https://dev.azure.com/${cleanRepoOrg}`;

    // Basic auth with PAT (format: username:PAT in base64)
    const auth = Buffer.from(`:${config.pat}`).toString('base64');
    const headers = {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json'
    };

    console.log('🔍 Testing Azure DevOps API Connection...\n');

    try {
        // Test 1: List all repositories in the org
        console.log('📦 Test 1: Fetching repositories...');
        const reposResponse = await fetch(
            `${baseUrl}/_apis/git/repositories?api-version=${config.apiVersion}`,
            { headers }
        );

        if (!reposResponse.ok) {
            throw new Error(`Failed to fetch repos: ${reposResponse.statusText}`);
        }

        const reposData: { value: Repository[] } = await reposResponse.json();
        console.log(`✅ Found ${reposData.value.length} repositories`);

        // Show first 3 repos
        reposData.value.slice(0, 3).forEach(repo => {
            console.log(`   - ${repo.project.name}/${repo.name}`);
        });

        // Test 2: Search for YAML files (likely contracts or Terraform)
        if (reposData.value.length > 0) {
            const firstRepo = reposData.value[0];
            console.log(`\n📄 Test 2: Searching for .yaml files in ${firstRepo.name}...`);
            const projectEncoded = encodeURIComponent(firstRepo.project.name);
            const searchUrl = `${baseUrl}/${projectEncoded}/_apis/search/codesearchresults?api-version=${config.apiVersion}`;

            const searchResponse = await fetch(
                searchUrl,
                {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({
                        searchText: '*.yaml',
                        $top: 5,
                        filters: {
                            Repository: [firstRepo.name]
                        }
                    })
                }
            );

            if (searchResponse.ok) {
                const searchData: SearchResult = await searchResponse.json();
                console.log(`✅ Found ${searchData.count} YAML files`);
                searchData.results?.slice(0, 3).forEach(result => {
                    console.log(`   - ${result.path}`);
                });
            } else {
                console.log(`⚠️  Search API not available (may need additional permissions)`);
            }
        }

        // Test 3: Get file content (try to read a contract file)
        if (reposData.value.length > 0) {
            const firstRepo = reposData.value[0];
            console.log(`\n📖 Test 3: Reading file from ${firstRepo.name}...`);

            // Try to get default branch
            const branchesResponse = await fetch(
                `${baseUrl}/${firstRepo.project.name}/_apis/git/repositories/${firstRepo.id}/refs?filter=heads/&api-version=${config.apiVersion}`,
                { headers }
            );

            if (branchesResponse.ok) {
                const branchesData: { value: any[] } = await branchesResponse.json();
                const defaultBranch = branchesData.value.find(b =>
                    b.name.includes('main') || b.name.includes('master')
                );

                if (defaultBranch) {
                    console.log(`✅ Default branch: ${defaultBranch.name.split('/').pop()}`);
                    console.log(`✅ Latest commit: ${defaultBranch.objectId.substring(0, 7)}`);
                }
            }
        }

        console.log('\n✅ Azure DevOps API connection successful!\n');
        return true;

    } catch (error) {
        console.error('❌ Azure DevOps API test failed:', error);
        return false;
    }
}

function loadConfig() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const relativeConfig = join(process.cwd(), 'scripts', 'config.json');

    if (existsSync(localConfig)) return JSON.parse(readFileSync(localConfig, 'utf8'));
    if (existsSync(rootConfig)) return JSON.parse(readFileSync(rootConfig, 'utf8'));
    if (existsSync(relativeConfig)) return JSON.parse(readFileSync(relativeConfig, 'utf8'));

    return null;
}

// Main execution
const fileConfig = loadConfig();
const devops = fileConfig?.devops || {};

const orgInput = process.env.AZURE_DEVOPS_ORG || devops.organization || devops.baseUrl || '';
const config: AzureDevOpsConfig = {
    organization: extractOrgName(orgInput),
    pat: process.env.AZURE_DEVOPS_PAT || devops.pat || '',
    apiVersion: '7.0'
};

console.log(`📍 Organization: ${config.organization}`);
console.log(`📍 API Version: ${config.apiVersion}\n`);

if (!config.organization || !config.pat) {
    console.error('❌ Missing required environment variables:');
    console.error('   AZURE_DEVOPS_ORG - Your Azure DevOps organization name');
    console.error('   AZURE_DEVOPS_PAT - Your Personal Access Token');
    console.error('\nGet PAT from: https://dev.azure.com/[your-org]/_usersSettings/tokens');
    console.error('Required scopes: Code (Read)');
    process.exit(1);
}

testAzureDevOpsAPI(config)
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
