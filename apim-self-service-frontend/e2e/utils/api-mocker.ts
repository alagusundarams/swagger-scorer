
import { Page } from '@playwright/test';
import { MOCK_PRODUCTS, MOCK_TEAMS, MOCK_APIS, MOCK_SUBSCRIPTIONS, MOCK_APPROVALS, MOCK_ENVIRONMENTS } from './mock-data';

// GLOBAL MOCK STATE
let statefulProducts: any[] = [];
let statefulTeams: any[] = [];
let statefulSubscriptions: any[] = [];

/**
 * Setup API Mocks with optional state reset.
 * @param page Playwright Page
 * @param options { reset: boolean } - Whether to reset mock state. Default true.
 */
export async function setupApiMocks(page: Page, options: { reset: boolean } = { reset: true }) {
    if (options.reset || statefulProducts.length === 0) {
        statefulProducts = JSON.parse(JSON.stringify(MOCK_PRODUCTS));
        statefulTeams = JSON.parse(JSON.stringify(MOCK_TEAMS));
        statefulSubscriptions = JSON.parse(JSON.stringify(MOCK_SUBSCRIPTIONS));
        console.log('[E2E INFRA] Mock State RESET');
    } else {
        console.log('[E2E INFRA] Mock State PRESERVED');
    }

    // Pipe console logs
    page.on('console', msg => {
        const t = msg.text();
        if (msg.type() === 'error' || t.includes('[adminClient]') || t.includes('[DASH]')) {
            console.log(`[BROWSER]: ${t}`);
        }
    });

    await page.route('**/api/v1/**', async (route) => {
        const url = route.request().url();
        const method = route.request().method();

        // 1. PRODUCTS
        if (url.includes('/products')) {
            const idMatch = url.match(/\/products\/([^\/\?]+)/);
            const pid = idMatch ? idMatch[1] : null;

            if (pid) {
                if (url.includes('/subscriptions')) {
                    // Return subscriptions for this product
                    const subs = statefulSubscriptions.filter(s => s.productId === pid);
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(subs) });
                }
                if (url.includes('/spec') || url.includes('mock-spec.yaml')) {
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ spec: 'openapi: 3.0.0\ninfo:\n  title: Mock API\n  version: 1.0.0' }) });
                }

                // Single Product Operations
                if (method === 'PATCH' || method === 'POST') {
                    const updates = JSON.parse(route.request().postData() || '{}');
                    const idx = statefulProducts.findIndex(p => p.id === pid);
                    if (idx !== -1) {
                        statefulProducts[idx] = { ...statefulProducts[idx], ...updates };
                        console.log(`[E2E MOCK] Updated Product ${pid}`);
                    }
                    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statefulProducts[idx] || {}) });
                }

                const product = statefulProducts.find(p => p.id === pid) || statefulProducts[0];
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(product) });
            }

            // Collection GET
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statefulProducts) });
        }

        // 2. TEAMS
        if (url.includes('/teams')) {
            const idMatch = url.match(/\/teams\/([^\/\?]+)/);
            const tid = idMatch ? idMatch[1] : null;

            if (tid && (method === 'PATCH' || method === 'POST')) {
                const updates = JSON.parse(route.request().postData() || '{}');
                const idx = statefulTeams.findIndex(t => t.id === tid);
                if (idx !== -1) { statefulTeams[idx] = { ...statefulTeams[idx], ...updates }; }
                return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(statefulTeams[idx] || {}) });
            }
            return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(tid ? statefulTeams.find(t => t.id === tid) : statefulTeams) });
        }

        // 3. OTHERS
        if (url.includes('/environments')) return route.fulfill({ status: 200, body: JSON.stringify(MOCK_ENVIRONMENTS) });
        if (url.includes('/subscriptions')) return route.fulfill({ status: 200, body: JSON.stringify(statefulSubscriptions) }); // Global sub list
        if (url.includes('/apis')) return route.fulfill({ status: 200, body: JSON.stringify(MOCK_APIS) });
        if (url.includes('/approvals')) return route.fulfill({ status: 200, body: JSON.stringify(MOCK_APPROVALS) });

        return route.fulfill({ status: 200, body: JSON.stringify([]) });
    });
}
