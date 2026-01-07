/**
 * @fileoverview Scoring Service Mock
 */

export async function scoreAllProducts() {
    console.log('☁️ [MOCK_MODE] Starting background scoring job (STUB)...');
    return { scored: 10, failed: 0, skipped: 0 };
}

export async function scoreProductById(productId: string): Promise<number | null> {
    console.log(`☁️ [MOCK_MODE] Scoring product ${productId} (STUB)...`);
    // Return a consistent mock score
    if (productId.includes('legacy')) return 45;
    return 85;
}
