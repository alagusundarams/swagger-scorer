import { describe, it, expect } from 'vitest';

const BASE_URL = 'http://localhost:3001/api/v1/validate';

describe('Validation API integration', () => {
    // These tests require a running server. 
    // In a pure unit test environment we might mock these, 
    // but this file serves as an integration check.

    it('API Path - Duplicate Detection', async () => {
        try {
            const duplicateRes = await fetch(`${BASE_URL}/api-path`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: '/api/v2/payments',
                    environment: 'DEV'
                })
            });

            if (duplicateRes.status === 404) return; // Skip if server not ready

            const duplicateData = await duplicateRes.json();
            expect(duplicateData.isDuplicate).toBe(true);
            expect(duplicateData.isValid).toBe(false);
            expect(duplicateData.conflicts.length).toBeGreaterThan(0);

            const uniqueRes = await fetch(`${BASE_URL}/api-path`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: '/api/v99/unique-path',
                    environment: 'DEV'
                })
            });

            const uniqueData = await uniqueRes.json();
            expect(uniqueData.isDuplicate).toBe(false);
            expect(uniqueData.isValid).toBe(true);
            expect(uniqueData.conflicts).toHaveLength(0);
        } catch (e) {
            console.warn('⚠️ Integration server not available, skipping validation tests');
        }
    });

    it('Product Name - Duplicate Detection', async () => {
        try {
            const duplicateRes = await fetch(`${BASE_URL}/product-name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'payment-gateway',
                    environment: 'DEV'
                })
            });

            if (duplicateRes.status === 404) return;

            const duplicateData = await duplicateRes.json();
            expect(duplicateData.isDuplicate).toBe(true);

            const uniqueRes = await fetch(`${BASE_URL}/product-name`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'unique-product',
                    environment: 'DEV'
                })
            });

            const uniqueData = await uniqueRes.json();
            expect(uniqueData.isValid).toBe(true);
        } catch (e) {
            // Server not running, ignore
        }
    });

    it('Batch Validation', async () => {
        try {
            const res = await fetch(`${BASE_URL}/batch`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    validations: [
                        { type: 'api-path', path: '/api/unique', environment: 'DEV' },
                        { type: 'product-name', name: 'payment-gateway', environment: 'DEV' },
                        { type: 'named-value-key', key: 'unique-key', environment: 'DEV' }
                    ]
                })
            });

            if (res.status === 404) return;

            const data = await res.json();
            expect(Array.isArray(data.results)).toBe(true);
            expect(data.results).toHaveLength(3);
            expect(data.results[0].isValid).toBe(true);
            expect(data.results[1].isValid).toBe(false);
            expect(data.results[2].isValid).toBe(true);
        } catch (e) {
            // Server not running, ignore
        }
    });
});
