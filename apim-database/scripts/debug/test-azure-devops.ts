import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { AzureService } from '../services/AzureService.js';

async function testAzureDevOpsAPI() {
    const rootConfig = join(process.cwd(), 'apim-database', 'config.json');
    const localConfig = join(process.cwd(), 'config.json');
    const config = existsSync(localConfig) ? JSON.parse(readFileSync(localConfig, 'utf8')) : (existsSync(rootConfig) ? JSON.parse(readFileSync(rootConfig, 'utf8')) : {});

    const devops = config.devops || {};
    const org = process.env.AZURE_DEVOPS_ORG || devops.organization || '';
    const pat = process.env.AZURE_DEVOPS_PAT || devops.pat || '';
    const baseUrl = devops.baseUrl || 'https://dev.azure.com';

    if (!org || !pat) {
        console.error('❌ Missing required credentials in config.json or environment variables.');
        process.exit(1);
    }

    console.log(`📍 Organization: ${org}`);
    console.log(`📍 Base URL: ${baseUrl}\n`);

    try {
        // Test 1: Verify Connection
        console.log('🔐 Test 1: Verifying Connection/PAT...');
        const connection = await AzureService.verifyAdoConnection(org, pat, baseUrl);
        console.log(`✅ Connection Verified: ${connection.authenticatedUser?.customDisplayName || connection.authenticatedUser?.id}`);

        // Test 2: List Projects
        console.log('\n📦 Test 2: Fetching Projects...');
        const projects = await AzureService.fetchADOProjects(org, pat, baseUrl);
        console.log(`✅ Found ${projects.length} projects`);
        projects.slice(0, 3).forEach(p => console.log(`   - ${p.name}`));

        // Test 3: Search for YAML (Code Search)
        console.log('\n🔍 Test 3: Testing Code Search (*.yaml)...');
        const search = await AzureService.searchCode(org, '*.yaml', pat, baseUrl);
        console.log(`✅ Search successful. Found ${search.count} matches.`);
        search.results?.slice(0, 3).forEach(r => console.log(`   - ${r.path} (${r.repository.name})`));

        console.log('\n✅ All Azure DevOps API tests passed!');
        return true;
    } catch (error: any) {
        console.error('\n❌ Azure DevOps API test failed:');
        console.error(error.message);
        return false;
    }
}

testAzureDevOpsAPI()
    .then(success => process.exit(success ? 0 : 1))
    .catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
