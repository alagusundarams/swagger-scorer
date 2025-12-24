/**
 * APIM Data Fetcher
 * 
 * Pulls real data from Azure APIM and discovers associated Azure Repos
 * Supporting organization-wide parallel fetch via config.json
 */

import { writeFileSync, mkdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import {
    AzureService,
    APIMConfig,
    ADOProject,
    ADORepo,
    ADOPipeline,
    PipelineRun
} from './services/AzureService.js';

interface EnvConfig {
    name: string;
    instance: string;
    resourceGroup: string;
    subscriptionId: string;
}

interface Product {
    id: string;
    name: string;
    properties: {
        displayName: string;
        description?: string;
        state: string;
        subscriptionRequired: boolean;
        approvalRequired: boolean;
    };
    gitInfo?: {
        repoUrl: string;
        lastCommit: string;
        lastCommitDate: string;
    };
    pipelineInfo?: {
        name: string;
        lastRunStatus: string;
        lastRunDate: string;
        url: string;
    };
}

interface API {
    id: string;
    name: string;
    properties: {
        displayName: string;
        description?: string;
        path: string;
        serviceUrl?: string;
        protocols: string[];
        subscriptionRequired: boolean;
    };
    productIds?: string[]; // Explicit product associations from APIM
}

interface Subscription {
    id: string;
    name: string;
    properties: {
        scope: string;
        displayName: string;
        state: string;
        createdDate: string;
    };
}

/**
 * Construct absolute ADO URL with line forensics
 */
function constructADOUrl(repoUrl: string, path: string, line?: number): string {
    if (!repoUrl || !path) return '';
    // repoUrl is usually https://dev.azure.com/org/project/_git/repo
    // Ensure path starts with /
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    let url = `${repoUrl}?path=${encodeURIComponent(normalizedPath)}&version=GBmaster&_a=contents`;
    if (line) {
        url += `&line=${line}&lineEnd=${line}&lineStartColumn=1&lineEndColumn=1`;
    }
    return url;
}

/**
 * Fetch a single environment
 */
async function fetchEnvironment(config: APIMConfig, adoRepos: ADORepo[]) {
    console.log(`📍 [${config.environment}] Starting Extraction...`);

    try {
        const productsData = await AzureService.fetchAPIM<Product>(config, '/products');
        const apisData = await AzureService.fetchAPIM<API>(config, '/apis');
        const subscriptionsData = await AzureService.fetchAPIM<Subscription>(config, '/subscriptions');


        console.log(`✅ [${config.environment}] APIM Snapshot Complete: ${productsData.value.length} Products.`);

        // Import Git repo helpers
        const { extractProductGitInfo } = await import('./git-repo-helper.js');
        const { findProductInTfvars, findAPIInTfvars, getAPIContractPath, getAPIPolicyPath } = await import('./tfvars-parser.js');

        // Enrichment: Reconcile APIM actual state with Git/tfvars declared state
        for (let i = 0; i < productsData.value.length; i++) {
            const product = productsData.value[i];
            const prodName = product.name.toLowerCase();
            const displayName = product.properties.displayName.toLowerCase();

            console.log(`\n📦 Processing product: ${product.properties.displayName}`);

            // Fetch Tags for automated ownership
            const tags = await AzureService.fetchTagsForProduct(config, product.id);
            if (Object.keys(tags).length > 0) {
                console.log(`  🏷️  Found tags: ${Object.keys(tags).join(', ')}`);
                // Automated Ownership Assignment
                if (tags.TeamID || tags.Owner) {
                    const owner = tags.TeamID || tags.Owner;
                    console.log(`  🎯 Auto-assigning ownership to: ${owner}`);
                    (product as any).ownerTeamId = owner;
                }
            }

            // Identify GRP products
            const isGrpByName = prodName.includes('grp') || displayName.includes('grp');
            if (isGrpByName) {
                (product as any).type = 'grp';
            }

            // Step 1: Find Git repo by name matching (hardened heuristic)
            const stripHeuristics = (s: string) => s
                .replace(/^grp_/i, '')
                .replace(/_grp$/i, '')
                .replace(/-grp$/i, '')
                .replace(/^apim-iac-/i, '')
                .replace(/-iac$/i, '')
                .replace(/^iac-/i, '');

            const prodBase = stripHeuristics(prodName);
            const displayBase = stripHeuristics(displayName.replace(/\s+/g, '-'));

            const matchedRepo = adoRepos.find(r => {
                const repoName = r.name.toLowerCase();
                const repoBase = stripHeuristics(repoName);

                return repoName === prodName ||
                    repoBase === prodBase ||
                    repoBase === displayBase ||
                    repoName.includes(prodName) ||
                    prodName.includes(repoName);
            });

            if (!matchedRepo) {
                console.log(`  ⚠️  No Git repo matched for ${product.properties.displayName}`);
                continue;
            }

            console.log(`  ✅ Matched repo: ${matchedRepo.name}`);

            // Step 2: Clone repo and parse tfvars
            const repoData = await extractProductGitInfo(product.name, matchedRepo.webUrl);

            if (!repoData) {
                console.log(`  ⚠️  Failed to extract tfvars data from repo`);
                continue;
            }

            const { gitInfo, tfvarsData } = repoData;

            // Step 3: Reconcile - Find this product in tfvars by name
            const tfvarsProduct = findProductInTfvars(product.name, tfvarsData);

            if (!tfvarsProduct) {
                console.log(`  ⚠️  Product "${product.name}" not found in tfvars (manual deployment?)`);
                // Still store Git info, but no precise paths
                product.gitInfo = gitInfo;
                continue;
            }

            console.log(`  ✅ Reconciled with tfvars product: ${tfvarsProduct.name}`);

            // Store enhanced Git info with tfvars metadata
            product.gitInfo = {
                ...gitInfo,
                productPolicyPath: tfvarsProduct.product_policy_path,
                productPolicyFile: tfvarsProduct.product_policy,
                managedByTfvars: true,
                definitionUrl: constructADOUrl(gitInfo.repoUrl, gitInfo.tfvarsFile, gitInfo.tfvarsLine),
                policyUrl: constructADOUrl(gitInfo.repoUrl, (tfvarsProduct.product_policy_path || '') + (tfvarsProduct.product_policy || ''))
            };

            // Step 4: Reconcile APIs for this product
            if (tfvarsProduct.api_name && tfvarsProduct.api_name.length > 0) {
                console.log(`  📋 Product has ${tfvarsProduct.api_name.length} APIs in tfvars`);

                // Store API mappings for later use when processing APIs
                (product as any).tfvarsAPIs = tfvarsProduct.api_name;
                (product as any).tfvarsData = tfvarsData;

                (product as any).tfvarsLineForAPI = gitInfo.apiLines;
            }

            // Step 5: Fetch Pipeline Hashes (Region-by-Region)
            if (config.devops?.pat && config.devops?.organization) {
                console.log(`  🚀 [Pipeline] Fetching regional hashes for ${product.properties.displayName}...`);
                try {
                    const pipelines = await AzureService.fetchADOPipelines(config.devops.organization, matchedRepo.project.name, matchedRepo.id, config.devops.pat, config.devops.baseUrl);

                    // Usually there's one main deployment pipeline
                    const mainPipeline = pipelines.find(p => p.name.toLowerCase().includes('deploy') || p.name.toLowerCase().includes('iac')) || pipelines[0];

                    if (mainPipeline) {
                        const runs = await AzureService.fetchPipelineRuns(config.devops.organization, matchedRepo.project.name, mainPipeline.id, config.devops.pat, config.devops.baseUrl);

                        // Extract hashes for regions (Simulated mapping logic)
                        // In a real app, you'd check stage/environment names in the run details
                        // For this POC, we'll map the latest successful run to the current env's region
                        const successfulRun = runs.find(r => r.result === 'succeeded' || r.status === 'completed');

                        if (successfulRun) {
                            const hash = successfulRun.resources?.repositories.self.version;
                            (product as any).deployments = {
                                [config.environment || 'DEV']: {
                                    hash: hash || 'unknown',
                                    date: successfulRun.finishedDate,
                                    status: 'active',
                                    pipelineUrl: mainPipeline._links.web.href
                                }
                            };
                            console.log(`  ✅ [Pipeline] Found hash for ${config.environment}: ${hash?.substring(0, 7)}`);
                        }
                    }
                } catch (pipeErr) {
                    console.error(`  ⚠️ [Pipeline] Error fetching details for ${product.name}:`, pipeErr);
                }
            }
        }

        // Enrich APIs: Reconcile with tfvars
        console.log(`\n🔗 Reconciling ${apisData.value.length} APIs with tfvars...`);

        for (const api of apisData.value) {
            const apiName = (api.name || '').toLowerCase();

            // Find which product(s) this API belongs to in APIM
            // We'll use the first product that has this API in its tfvars
            let matchedProduct: Product | undefined;
            let tfvarsAPI: any = null;

            for (const product of productsData.value) {
                const tfvarsAPIs = (product as any).tfvarsAPIs;
                const tfvarsData = (product as any).tfvarsData;

                if (tfvarsAPIs && tfvarsAPIs.includes(api.name)) {
                    matchedProduct = product;
                    tfvarsAPI = findAPIInTfvars(api.name, tfvarsData);
                    break;
                }
            }

            if (matchedProduct && tfvarsAPI) {
                console.log(`  ✅ API "${api.name}" reconciled with product "${matchedProduct.properties.displayName}"`);

                // Store Git info with precise paths from tfvars
                const contractPath = getAPIContractPath(tfvarsAPI);
                const policyPath = getAPIPolicyPath(tfvarsAPI);

                (api as any).gitInfo = {
                    repoUrl: (matchedProduct as any).gitInfo?.repoUrl,
                    lastCommit: (matchedProduct as any).gitInfo?.lastCommit,
                    lastCommitDate: (matchedProduct as any).gitInfo?.lastCommitDate,
                    contractPath: contractPath,  // Full path from tfvars
                    policyPath: policyPath,
                    managedByTfvars: true,
                    definitionUrl: (matchedProduct as any).gitInfo?.tfvarsFile ? constructADOUrl((matchedProduct as any).gitInfo.repoUrl, (matchedProduct as any).gitInfo.tfvarsFile, (matchedProduct as any).tfvarsLineForAPI?.[api.name]) : undefined,
                    contractUrl: constructADOUrl((matchedProduct as any).gitInfo?.repoUrl || '', contractPath || ''),
                    policyUrl: constructADOUrl((matchedProduct as any).gitInfo?.repoUrl || '', policyPath || '')
                };
            } else {
                console.log(`  ⚠️  API "${api.name}" not found in any tfvars (manual deployment?)`);
            }
        }

        const output = {
            fetchedAt: new Date().toISOString(),
            instance: config.instance,
            environment: config.environment,
            summary: {
                totalProducts: productsData.value.length,
                totalAPIs: apisData.value.length,
                totalSubscriptions: subscriptionsData.value.length
            },
            products: productsData.value,
            apis: apisData.value,
            subscriptions: subscriptionsData.value
        };

        const outputDir = join(process.cwd(), 'data');
        mkdirSync(outputDir, { recursive: true });
        const timestamp = new Date().toISOString().split('T')[0];
        const outputFile = join(outputDir, `apim-data-${(config.environment || 'dev').toLowerCase()}-${timestamp}.json`);

        writeFileSync(outputFile, JSON.stringify(output, null, 2));
        console.log(`💾 [${config.environment || 'DEV'}] Saved matching state to: ${outputFile}`);

        return outputFile;
    } catch (error) {
        console.error(`❌ [${config.environment}] Extraction failed:`, error);
        throw error;
    }
}

/**
 * Main execution
 */
async function main() {
    console.log('🚀 Starting Zero-Config Azure Repos & APIM Data Extraction...\n');

    try {
        const configPath = join(process.cwd(), 'config.json');
        if (!existsSync(configPath)) {
            console.error('❌ Error: config.json not found.');
            process.exit(1);
        }

        const configFile = JSON.parse(readFileSync(configPath, 'utf8'));
        const envsToFetch = configFile.azure.environments;
        const devops = configFile.devops;

        const accessToken = await AzureService.getAzureAccessToken();
        console.log('✅ Azure Access Token acquired.');

        // 1. FULL AUTODISCOVERY: Fetch every project and repo in the Org
        let allRepos: ADORepo[] = [];
        if (devops?.pat && devops?.organization) {
            const projects = await AzureService.fetchADOProjects(devops.organization, devops.pat, devops.baseUrl);
            allRepos = await AzureService.fetchADOReposAcrossProjects(devops.organization, projects, devops.pat, devops.baseUrl);
            console.log(`✅ [ADO] Discovery Complete: Crawled ${projects.length} projects and found ${allRepos.length} repositories.\n`);
        } else {
            console.warn('⚠️ [ADO] Skipping discovery (missing credentials)\n');
        }

        if (!envsToFetch || envsToFetch.length === 0) {
            console.error('❌ Error: No APIM environments configured.');
            process.exit(1);
        }

        // 2. Parallel Extraction
        await Promise.all(envsToFetch.map((env: any) => fetchEnvironment({
            ...env,
            environment: env.name,
            accessToken,
            devops
        }, allRepos)));

        console.log('\n✨ Fully automated extraction and discovery cycle finished!');
    } catch (error) {
        console.error('\n❌ Fatal error:', error);
        process.exit(1);
    }
}

main();
