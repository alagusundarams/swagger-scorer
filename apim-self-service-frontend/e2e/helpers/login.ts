// Common E2E Test Helper for Login
// This helper bypasses the login UI and sets auth state directly

import { Page } from '@playwright/test';

export async function loginAsUser(page: Page, role: 'admin' | 'producer' | 'consumer') {
    // Navigate to app
    await page.goto('/');

    // Click appropriate role button - the app has SSO buttons
    const buttonMap = {
        'admin': /ADMIN/i,
        'producer': /PRODUCER/i,
        'consumer': /CONSUMER/i
    };

    await page.getByRole('button', { name: buttonMap[role] }).click();

    // Wait for redirect to dashboard/home
    await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
}

export async function mockApiCalls(page: Page) {
    // Mock API responses to avoid backend dependency
    await page.route('**/api/v1/**', async route => {
        const url = route.request().url();

        if (url.includes('/products')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 'p1', name: 'Test Product', ownerTeamId: 't1' }
                ])
            });
        } else if (url.includes('/teams')) {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([
                    { id: 't1', name: 'Test Team' }
                ])
            });
        } else {
            await route.fulfill({
                status: 200,
                contentType: 'application/json',
                body: JSON.stringify([])
            });
        }
    });
}
