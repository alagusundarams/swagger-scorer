
import { type Page } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_APIS, MOCK_TEAMS, MOCK_SUBSCRIPTIONS, MOCK_APPROVALS } from './mock-data';

/**
 * Setup API Mocks for Playwright tests
 * Intercepts /api/v1/* calls and returns mock data.
 */
export async function setupApiMocks(page: Page) {
    // Pipe browser console to test runner console
    page.on('console', msg => {
        if (msg.type() === 'error' || msg.text().includes('[DASH]') || msg.text().includes('[DETAIL]')) {
            console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`);
        }
    });

    // Log all requests to help debugging
    await page.route('**/*', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        if (url.includes('/api/v1/')) {
            console.log(`[E2E MOCK] Intercepting ${method} ${url}`);

            // 1. Products - Be smart about ID vs Collection
            if (url.includes('/products')) {
                // Check if it's a specific product ID (e.g., /products/prod-001)
                const parts = url.split('/products/');
                if (parts.length > 1) {
                    const productId = parts[1].split('?')[0].split('/')[0];
                    const product = MOCK_PRODUCTS.find(p => p.id === productId) || MOCK_PRODUCTS[0];
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(product) });
                }

                if (method === 'GET') {
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRODUCTS) });
                }
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_PRODUCTS[0]) });
            }

            // 2. APIs
            if (url.includes('/apis')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_APIS) });
            }

            // 3. Teams
            if (url.includes('/teams')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_TEAMS) });
            }

            // 4. Subscriptions
            if (url.includes('/subscriptions')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_SUBSCRIPTIONS) });
            }

            // 5. Approvals
            if (url.includes('/approvals')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(MOCK_APPROVALS) });
            }

            // 6. Health
            if (url.includes('/health')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'UP' }) });
            }

            // 7. Config
            if (url.includes('/config')) {
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ version: '1.0.0', env: 'E2E' }) });
            }

            // Default fallback for other api/v1 calls
            return route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify(method === 'GET' ? [] : { success: true })
            });
        }

        // Continue all non-api requests
        await route.continue();
    });
}
