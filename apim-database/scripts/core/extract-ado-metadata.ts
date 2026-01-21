import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

const sanitize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');

export async function extractADOMetadata(products: any[], targetProduct?: string, targetEnv?: string, verbose = false) {
    if (verbose) console.log(`\n🚀 Starting ADO Metadata Extraction...`);

    // --- AUTH ---
    let bearerToken: string | undefined;
    try {
        bearerToken = await AzureService.getAdoAccessToken();
    } catch (e) { }

    const configPath = join(process.cwd(), 'config.json');
    const config = JSON.parse(readFileSync(configPath, 'utf8'));
    const devops = config.devops;

    const results: any[] = [];
    const filteredProducts = targetProduct ? products.filter(p => sanitize(p.name) === sanitize(targetProduct)) : products;

    for (const prod of filteredProducts) {
        if (verbose) console.log(`\n📦 Processing Product: ${prod.name}`);

        const meta: any = {
            productName: prod.name,
            deployments: {},
            status: 'MATCHED'
        };

        try {
            // --- PHASE 1: REPO DISCOVERY ---
            const query = `${prod.name} ext:tf`;
            const searchRes = await AzureService.searchCode(devops.organization, query, devops.pat, devops.baseUrl, bearerToken);
            let repo = searchRes.results?.[0]?.repository;

            if (!repo) {
                const broadRes = await AzureService.searchCode(devops.organization, prod.name, devops.pat, devops.baseUrl, bearerToken);
                repo = broadRes.results?.[0]?.repository;
            }

            if (!repo) {
                meta.status = 'REPO_MISSING';
                results.push(meta);
                continue;
            }

            const repoDetails = await AzureService.fetchRepoById(devops.organization, repo.id, devops.pat, devops.baseUrl, bearerToken);
            const projectId = repoDetails.project.id;

            // --- PHASE 2: PIPELINE DISCOVERY ---
            let buildDefs = await AzureService.fetchADOBuildDefinitions(devops.organization, projectId, repo.id, devops.pat, devops.baseUrl, bearerToken);
            if (buildDefs.length === 0) {
                buildDefs = await AzureService.fetchADOBuildDefinitions(devops.organization, projectId, undefined, devops.pat, devops.baseUrl, bearerToken, repo.name);
            }

            if (buildDefs.length === 0) {
                meta.status = 'PIPELINE_MISSING';
                results.push(meta);
                continue;
            }

            const pipelineCandidates = buildDefs.map(p => {
                const cleanPipe = sanitize(p.name);
                const cleanProd = sanitize(prod.name);
                let score = 0;
                if (cleanPipe === cleanProd) score += 100;
                if (cleanPipe.includes(cleanProd)) score += 50;
                if (cleanPipe.includes('deploy') || cleanPipe.includes('iac')) score += 10;
                return { pipe: p, score };
            }).sort((a, b) => b.score - a.score);

            const matchedPipeline = pipelineCandidates[0].pipe;

            // --- PHASE 3: HYBRID DEPLOYMENT EXTRACTION ---
            const envsToSync = targetEnv ? [targetEnv] : prod.environments || ['DEV', 'QA', 'STAGE', 'PROD'];
            const pipelineProject = matchedPipeline.project?.id || projectId;

            // 3.1: CAPTURE BASELINE HASH
            let baselineData: any | undefined;
            try {
                const latestBuild = await AzureService.fetchLatestSuccessfulBuild(devops.organization, pipelineProject, matchedPipeline.id, devops.pat, devops.baseUrl, bearerToken);
                if (latestBuild) {
                    let commitHash = latestBuild.sourceVersion;
                    if (latestBuild.repository?.name?.toLowerCase() !== repo.name.toLowerCase()) {
                        const details = await AzureService.fetchADOBuild(devops.organization, latestBuild.project?.id || pipelineProject, latestBuild.id, devops.pat, devops.baseUrl, bearerToken);
                        if (details?.resources?.repositories) {
                            const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === repo.name.toLowerCase());
                            if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                        }
                    }
                    if (commitHash && commitHash !== 'unknown') {
                        baselineData = {
                            hash: commitHash,
                            date: latestBuild.finishTime || latestBuild.queueTime || new Date().toISOString(),
                            branch: (latestBuild.sourceBranch || 'unknown').replace('refs/heads/', ''),
                            author: latestBuild.requestedFor?.displayName || 'Unknown',
                            message: latestBuild.triggerInfo?.['ci.message'] || latestBuild.sourceVersionMessage || 'No message',
                            url: latestBuild._links?.web?.href
                        };
                    }
                }
            } catch (e) { }

            for (const envName of envsToSync) {
                // Initialize with baseline if available
                if (baselineData) {
                    meta.deployments[envName] = { ...baselineData };
                }

                // Try Surgical Strike (Environment API)
                let deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, pipelineProject, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
                if (!deploy && pipelineProject !== projectId) {
                    deploy = await AzureService.fetchLatestEnvironmentDeployment(devops.organization, projectId, matchedPipeline.id, envName, devops.pat, devops.baseUrl, bearerToken);
                }

                if (deploy) {
                    const build = deploy.build || deploy.owner;
                    if (build) {
                        let commitHash = build.sourceVersion;
                        if (build.repository?.name?.toLowerCase() !== repo.name.toLowerCase()) {
                            const details = await AzureService.fetchADOBuild(devops.organization, build.project?.id || pipelineProject, build.id, devops.pat, devops.baseUrl, bearerToken);
                            if (details?.resources?.repositories) {
                                const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === repo.name.toLowerCase());
                                if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                            }
                        }

                        if (commitHash && commitHash !== 'unknown') {
                            meta.deployments[envName] = {
                                hash: commitHash,
                                date: deploy.finishTime || build.finishTime || new Date().toISOString(),
                                branch: (build.sourceBranch || 'unknown').replace('refs/heads/', ''),
                                author: build.requestedFor?.displayName || 'Unknown',
                                message: build.triggerInfo?.['ci.message'] || 'No message',
                                url: build._links?.web?.href
                            };
                            continue;
                        }
                    }
                }

                // Try Stage Scanner (Fall back to it if Baseline exists or as a last resort)
                const stageResults = await AzureService.fetchLatestStageResults(devops.organization, pipelineProject, matchedPipeline.id, [envName], devops.pat, devops.baseUrl, bearerToken);
                const result = stageResults[envName.toUpperCase()];
                if (result && result.buildId) {
                    const details = await AzureService.fetchADOBuild(devops.organization, pipelineProject, result.buildId, devops.pat, devops.baseUrl, bearerToken);
                    if (details) {
                        let commitHash = details.sourceVersion;
                        if (details.repository?.name?.toLowerCase() !== repo.name.toLowerCase() && details.resources?.repositories) {
                            const targetRes = Object.values(details.resources.repositories).find((r: any) => r.repository?.name?.toLowerCase() === repo.name.toLowerCase());
                            if ((targetRes as any)?.version) commitHash = (targetRes as any).version;
                        }
                        meta.deployments[envName] = {
                            hash: commitHash,
                            date: result.date || details.finishTime || new Date().toISOString(),
                            branch: (details.sourceBranch || 'unknown').replace('refs/heads/', ''),
                            author: details.requestedFor?.displayName || 'Unknown',
                            message: details.triggerInfo?.['ci.message'] || 'No message',
                            url: details._links?.web?.href
                        };
                    }
                }
            }

            results.push(meta);
        } catch (e: any) {
            if (verbose) console.error(`❌ Error processing ${prod.name}: ${e.message}`);
            results.push(meta);
        }
    }

    const dataDir = join(process.cwd(), 'scripts', 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir, { recursive: true });
    writeFileSync(join(dataDir, 'ado-metadata.json'), JSON.stringify(results, null, 2), 'utf8');
}
