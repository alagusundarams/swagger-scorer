/**
 * @fileoverview APIM Service Mock
 */

export async function updateProductMetadata(productId: string, adGroupId: string, environment: string): Promise<boolean> {
    console.log(`☁️ [MOCK_MODE] Syncing Azure AD Group ${adGroupId} to APIM Product ${productId} (${environment})...`);
    console.log(`☁️ [MOCK_MODE] ✅ APIM Metadata successfully updated for ${productId}`);
    return true;
}

export async function createProduct(name: string, payload: any, _environment: string = 'dev') {
    console.log(`☁️ [MOCK_MODE] Create Product: ${name}`);
    return { name, ...payload };
}

export async function createApi(productId: string, payload: any, _environment: string = 'dev') {
    console.log(`☁️ [MOCK_MODE] Create API for Product ${productId}`);
    return { id: payload.name, ...payload };
}

export async function createNamedValue(productId: string, payload: any, _environment: string = 'dev') {
    console.log(`☁️ [MOCK_MODE] Create Named Value for Product ${productId}`);
    return { id: payload.name, ...payload };
}

export async function createBackend(payload: any, _environment: string = 'dev') {
    console.log(`☁️ [MOCK_MODE] Create Backend: ${payload.name}`);
    return { id: payload.name, ...payload };
}

export async function syncToAPIM(productId: string, environment: string) {
    console.log(`☁️ [MOCK_MODE] 🚀 Deploying to APIM ${environment.toUpperCase()} INSTANCE for product: ${productId}`);
    return {
        success: true,
        instance: `apim-mock-${environment.toLowerCase()}`,
        details: `Successfully synchronized to mock instance`
    };
}

import { ArmServiceMock } from './ArmService.mock.js';

export async function getArmService(_environment: string): Promise<any> {
    return new ArmServiceMock();
}
