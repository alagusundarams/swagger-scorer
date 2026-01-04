
import { build } from '../src/server.js';

async function runVerification() {
    console.log('🚀 Starting Verification Script...');

    const fastify = await build();

    try {
        // 1. Verify Multi-Environment Product Details (DEV)
        console.log('\n🔍 Verifying ENV=DEV Product Fetch...');
        const devRes = await fastify.inject({
            method: 'GET',
            url: '/api/v1/products/prod-payment-v2?environment=DEV'
        });

        if (devRes.statusCode !== 200) {
            throw new Error(`Failed to fetch product: ${devRes.statusCode} ${devRes.payload}`);
        }

        const devProduct = JSON.parse(devRes.payload);
        console.log('✅ Fetched Product:', devProduct.id);

        if (devProduct.environment !== 'DEV') {
            throw new Error(`Expected environment DEV, got ${devProduct.environment}`);
        }
        console.log('✅ Environment matches: DEV');

        if (devProduct.envHashes.DEV !== 'new-feature-hash-xyz') {
            throw new Error(`Expected DEV hash 'new-feature-hash-xyz', got ${devProduct.envHashes.DEV}`);
        }
        console.log('✅ DEV Hash Verified:', devProduct.envHashes.DEV);


        // 2. Verify Multi-Environment Product Details (PROD)
        console.log('\n🔍 Verifying ENV=PROD Product Fetch...');
        const prodRes = await fastify.inject({
            method: 'GET',
            url: '/api/v1/products/prod-payment-v2?environment=PROD'
        });
        const prodProduct = JSON.parse(prodRes.payload);

        if (prodProduct.environment !== 'PROD') {
            throw new Error(`Expected environment PROD, got ${prodProduct.environment}`);
        }
        console.log('✅ Environment matches: PROD');

        if (prodProduct.envHashes.PROD !== 'a1b2c3d') {
            throw new Error(`Expected PROD hash 'a1b2c3d', got ${prodProduct.envHashes.PROD}`);
        }
        console.log('✅ PROD Hash Verified:', prodProduct.envHashes.PROD);


        // 3. Verify Approval Request (Validation Gate Seed Data)
        console.log('\n🔍 Verifying Approval Request Seed Data...');
        const approvalsRes = await fastify.inject({
            method: 'GET',
            url: '/api/v1/approvals'
        });
        const approvals = JSON.parse(approvalsRes.payload);

        const targetRequest = approvals.find((a: any) => a.id === 'req-onboarding-01');
        if (!targetRequest) {
            throw new Error('Approval request req-onboarding-01 not found');
        }
        console.log('✅ Approval Request Found:', targetRequest.id);

        if (targetRequest.type !== 'PRODUCT_ONBOARDING') {
            throw new Error(`Expected type PRODUCT_ONBOARDING, got ${targetRequest.type}`);
        }
        console.log('✅ Request Type Verified:', targetRequest.type);

        console.log('\n🎉 ALL VERIFICATIONS PASSED.');

    } catch (err) {
        console.error('❌ Verification Failed:', err);
        process.exit(1);
    } finally {
        await fastify.close();
    }
}

runVerification();
