/**
 * @fileoverview Fetch Azure AD Groups
 * 
 * Fetches user's Azure AD group memberships using Azure CLI and Microsoft Graph API
 * Populates teams table with real AD group data
 */

import { writeFileSync } from 'fs';
import { execSync } from 'child_process';

interface ADGroup {
    id: string;
    displayName: string;
    description?: string;
    mail?: string;
}

interface Team {
    id: string;
    name: string;
    azureAdGroupId: string;
    type: 'producer' | 'consumer' | 'both';
    description: string;
}

/**
 * Get Azure access token for Microsoft Graph
 */
function getGraphToken(): string {
    try {
        const token = execSync(
            'az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv',
            { encoding: 'utf-8' }
        ).trim();
        return token;
    } catch (err) {
        throw new Error(`Failed to get Graph API token. Ensure you're logged in via 'az login': ${err}`);
    }
}

/**
 * Fetch user's AD group memberships
 */
async function fetchUserGroups(token: string): Promise<ADGroup[]> {
    try {
        const response = await fetch('https://graph.microsoft.com/v1.0/me/memberOf', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Graph API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as { value: Array<ADGroup & { '@odata.type': string }> };
        return data.value.filter(g => g['@odata.type'] === '#microsoft.graph.group');
    } catch (err) {
        throw new Error(`Failed to fetch AD groups: ${err instanceof Error ? err.message : String(err)}`);
    }
}

/**
 * Infer team type from group name
 */
function inferTeamType(groupName: string): 'producer' | 'consumer' | 'both' {
    const name = groupName.toLowerCase();

    if (name.includes('platform') || name.includes('api') || name.includes('producer')) {
        return 'producer';
    }

    if (name.includes('consumer') || name.includes('app') || name.includes('client')) {
        return 'consumer';
    }

    return 'both';
}

/**
 * Convert AD group to team format
 */
function convertToTeam(group: ADGroup): Team {
    return {
        id: `team-${group.id.substring(0, 8)}`,
        name: group.displayName,
        azureAdGroupId: group.id,
        type: inferTeamType(group.displayName),
        description: group.description || `Team managed by Azure AD group: ${group.displayName}`
    };
}

/**
 * Main execution
 */
async function main() {
    console.log('🔍 Fetching Azure AD groups...\n');

    try {
        // Get Graph API token
        console.log('📍 Getting Microsoft Graph API token...');
        const token = getGraphToken();
        console.log('✅ Token acquired\n');

        // Fetch user's groups
        console.log('📡 Fetching your AD group memberships...');
        const groups = await fetchUserGroups(token);
        console.log(`✅ Found ${groups.length} groups\n`);

        // Convert to teams
        const teams = groups.map(convertToTeam);

        // Save to file
        const output = {
            fetchedAt: new Date().toISOString(),
            source: 'Azure AD (via Microsoft Graph)',
            userPrincipal: execSync('az account show --query user.name -o tsv', { encoding: 'utf-8' }).trim(),
            teams
        };

        writeFileSync('ad-groups.json', JSON.stringify(output, null, 2));
        console.log(`💾 Saved ${teams.length} teams to ad-groups.json\n`);

        // Display summary
        console.log('📊 Team Summary:');
        console.log(`  - Producers: ${teams.filter(t => t.type === 'producer').length}`);
        console.log(`  - Consumers: ${teams.filter(t => t.type === 'consumer').length}`);
        console.log(`  - Both: ${teams.filter(t => t.type === 'both').length}`);
        console.log('\n✅ Done! Use this data in migration with `npm run migrate`');
    } catch (err) {
        console.error('❌ Error:', err instanceof Error ? err.message : String(err));
        process.exit(1);
    }
}

main();
