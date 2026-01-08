
import { describe, it, expect } from 'vitest';
import { ResourceDiscovery } from './resourceDiscovery';

describe('ResourceDiscovery', () => {
    const fileList = [
        'Policy/Product/StandardProd.xml',
        'Policy/Product/GRP_Prod_DEV.xml',
        'Policy/Product/GRP_Prod.xml',
        'Policy/API/payment-api/payment-api.xml',
        'API/payment-api/payment-api.json',
        'API/search-api/search-api.yaml',
        'API/search-api/extra.json', // Ambiguity case
    ];

    it('should resolve standard product policy', () => {
        const path = ResourceDiscovery.resolveProductPolicyPath(fileList, 'StandardProd', 'DEV');
        expect(path).toBe('Policy/Product/StandardProd.xml');
    });

    it('should resolve GRP product policy with env override', () => {
        const path = ResourceDiscovery.resolveProductPolicyPath(fileList, 'GRP_Prod', 'DEV');
        expect(path).toBe('Policy/Product/GRP_Prod_DEV.xml');
    });

    it('should resolve API policy', () => {
        const path = ResourceDiscovery.resolveApiPolicyPath(fileList, 'StandardProd', 'payment-api');
        expect(path).toBe('Policy/API/payment-api/payment-api.xml');
    });

    it('should resolve API contract (.json)', () => {
        const path = ResourceDiscovery.resolveContractPath(fileList, 'StandardProd', 'payment-api');
        expect(path).toBe('API/payment-api/payment-api.json');
    });

    it('should return null for multiple contracts in the same folder (Ambiguity)', () => {
        const path = ResourceDiscovery.resolveContractPath(fileList, 'StandardProd', 'search-api');
        expect(path).toBe(null);
    });

    it('should return null for missing paths', () => {
        const path = ResourceDiscovery.resolveApiPolicyPath(fileList, 'StandardProd', 'missing-api');
        expect(path).toBe(null);
    });
});
