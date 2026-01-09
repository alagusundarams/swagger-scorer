
import { execSync } from 'child_process';
// import { AppConfig } from '../../types/index.js';

export interface AppRegistration {
    clientId: string;
    displayName: string;
    appIdUri?: string;
    secretExpiryDate?: string;
}

export class AzureService {
    // Config suppressed for future use
    // private static config: AppConfig;
    // static initialize(config: AppConfig) { this.config = config; }

    /**
     * Get MS Graph access token using Azure CLI
     * Note: In production, this should use Managed Identity or DefaultAzureCredential
     */
    private static async getGraphAccessToken(): Promise<string> {
        try {
            // Check for cached/env token first if we want to optimize, 
            // but for safety/simplicity following the script's lead of using CLI
            const token = execSync('az account get-access-token --resource https://graph.microsoft.com --query accessToken -o tsv', {
                encoding: 'utf-8',
                stdio: ['ignore', 'pipe', 'ignore'] // Suppress stderr
            }).trim();
            return token;
        } catch (error: any) {
            console.warn('⚠️ [AzureService] Could not get Graph Token via Azure CLI. Ensure "az login" is run on the server host.');
            throw new Error('Failed to authenticate with Azure. Please ensure the server has Azure CLI access.');
        }
    }

    /**
     * Search for App Registrations by Display Name or Client ID
     * Uses Microsoft Graph API
     */
    static async searchAppRegistrations(query: string): Promise<AppRegistration[]> {
        if (!query || query.length < 3) return [];

        const token = await this.getGraphAccessToken();
        const results: AppRegistration[] = [];

        try {
            // Graph API Filter: "startswith(displayName, 'query') or appId eq 'query'"
            // Note: complex OR clauses can be tricky in Graph, so we'll primarily search displayName
            // and do a direct ID check parallel if it looks like a GUID.

            const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(query);
            let filterString = `startswith(displayName, '${query}')`;
            if (isGuid) {
                filterString = `appId eq '${query}'`;
            }

            const url = `https://graph.microsoft.com/v1.0/applications?$filter=${filterString}&$select=appId,displayName,identifierUris,passwordCredentials&$top=15`;

            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const txt = await response.text();
                console.error(`❌ [AzureService] Graph Search Failed: ${response.status} ${txt}`);
                return [];
            }

            const data = await response.json() as { value: any[] };
            if (data.value) {
                results.push(...data.value.map((app: any) => {
                    // Extract earliest expiring secret
                    let nearestExpiry: string | undefined = undefined;
                    if (app.passwordCredentials && app.passwordCredentials.length > 0) {
                        const expiries = app.passwordCredentials
                            .map((p: any) => p.endDateTime)
                            .filter((d: string) => d)
                            .sort();
                        nearestExpiry = expiries[0];
                    }

                    return {
                        clientId: app.appId,
                        displayName: app.displayName,
                        appIdUri: (app.identifierUris && app.identifierUris.length > 0) ? app.identifierUris[0] : undefined,
                        secretExpiryDate: nearestExpiry
                    };
                }));
            }
        } catch (err: any) {
            console.error(`❌ [AzureService] Search Error:`, err.message);
        }

        return results;
    }

    /**
     * Validate if a specific App Registration exists by Client ID
     * Returns key details if found, null otherwise.
     */
    static async validateAppRegistration(clientId: string): Promise<AppRegistration | null> {
        if (!clientId) return null;

        // Strict GUID check
        if (!/^[0-9a-f]{8}-[0-9a-f]{4}/i.test(clientId)) {
            return null;
        }

        const token = await this.getGraphAccessToken();

        try {
            const url = `https://graph.microsoft.com/v1.0/applications?$filter=appId eq '${clientId}'&$select=appId,displayName,identifierUris,passwordCredentials`;
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json() as { value: any[] };
                if (data.value && data.value.length > 0) {
                    const app = data.value[0];

                    // Extract earliest expiring secret
                    let nearestExpiry: string | undefined = undefined;
                    if (app.passwordCredentials && app.passwordCredentials.length > 0) {
                        const expiries = app.passwordCredentials
                            .map((p: any) => p.endDateTime)
                            .filter((d: string) => d)
                            .sort();
                        nearestExpiry = expiries[0];
                    }

                    return {
                        clientId: app.appId,
                        displayName: app.displayName,
                        appIdUri: (app.identifierUris && app.identifierUris.length > 0) ? app.identifierUris[0] : undefined,
                        secretExpiryDate: nearestExpiry
                    };
                }
            }
        } catch (err: any) {
            console.warn(`⚠️ [AzureService] Validation failed for ${clientId}: ${err.message}`);
        }

        return null;
    }
}
