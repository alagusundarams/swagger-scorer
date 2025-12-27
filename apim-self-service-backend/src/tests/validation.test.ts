/**
 * @fileoverview Validation API Tests
 * 
 * Manual test suite for duplicate detection endpoints
 */

import { test } from 'node:test';
import assert from 'node:assert';

const BASE_URL = 'http://localhost:3001/api/v1/validate';

/**
 * Test API Path Validation
 */
test('API Path - Duplicate Detection', async () => {
    // Test duplicate path
    const duplicateRes = await fetch(`${BASE_URL}/api-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: '/api/v2/payments',
            environment: 'DEV'
        })
    });

    const duplicateData = await duplicateRes.json();
    assert.strictEqual(duplicateData.isDuplicate, true, 'Should detect duplicate path');
    assert.strictEqual(duplicateData.isValid, false, 'Should mark as invalid');
    assert.ok(duplicateData.conflicts.length > 0, 'Should return conflicts');

    // Test unique path
    const uniqueRes = await fetch(`${BASE_URL}/api-path`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            path: '/api/v99/unique-path',
            environment: 'DEV'
        })
    });

    const uniqueData = await uniqueRes.json();
    assert.strictEqual(uniqueData.isDuplicate, false, 'Should not detect duplicate');
    assert.strictEqual(uniqueData.isValid, true, 'Should mark as valid');
    assert.strictEqual(uniqueData.conflicts.length, 0, 'Should have no conflicts');

    console.log('✅ API Path validation tests passed');
});

/**
 * Test Product Name Validation
 */
test('Product Name - Duplicate Detection', async () => {
    // Test duplicate product
    const duplicateRes = await fetch(`${BASE_URL}/product-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'payment-gateway',
            environment: 'DEV'
        })
    });

    const duplicateData = await duplicateRes.json();
    assert.strictEqual(duplicateData.isDuplicate, true, 'Should detect duplicate product');

    // Test unique product
    const uniqueRes = await fetch(`${BASE_URL}/product-name`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            name: 'unique-product',
            environment: 'DEV'
        })
    });

    const uniqueData = await uniqueRes.json();
    assert.strictEqual(uniqueData.isValid, true, 'Should mark unique product as valid');

    console.log('✅ Product Name validation tests passed');
});

/**
 * Test Batch Validation
 */
test('Batch Validation', async () => {
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

    const data = await res.json();
    assert.ok(Array.isArray(data.results), 'Should return results array');
    assert.strictEqual(data.results.length, 3, 'Should validate all 3 items');

    // First should be valid (unique path)
    assert.strictEqual(data.results[0].isValid, true);

    // Second should be invalid (duplicate product)
    assert.strictEqual(data.results[1].isValid, false);

    // Third should be valid (unique named value)
    assert.strictEqual(data.results[2].isValid, true);

    console.log('✅ Batch validation tests passed');
});

console.log('\n🧪 Running validation tests...\n');
