/**
 * E2E Test - Product Management
 */

import { test, expect } from '@playwright/test';

test.describe('Product Management Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as producer using role button
        await page.goto('/login');
        await page.getByRole('button', { name: /PRODUCER/i }).click();
        await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
    });

    test.skip('producer can view product details', async ({ page }) => {
        // TODO: Fix when product detail page structure is finalized
        await page.goto('/products/prod-user-api');

        // Verify product name is displayed
        await expect(page.locator('h1')).toContainText('User API');

        // Verify team information from context
        await expect(page.locator('[data-testid="owner-team"]')).toBeVisible();
    });

    test.skip('producer can view subscribers', async ({ page }) => {
        await page.goto('/products/prod-user-api');

        // Navigate to subscribers tab
        await page.click('text=Subscribers');

        // Verify subscriber list loads
        await expect(page.locator('[data-testid="subscriber-list"]')).toBeVisible();
    });

    test('product data refreshes after team update', async ({ page, context }) => {
        // Open product page
        await page.goto('/products/prod-user-api');
        const initialTeamName = await page.locator('[data-testid="owner-team"]').textContent();

        // Open admin panel in new page
        const adminPage = await context.newPage();
        await adminPage.goto('/admin');
        await adminPage.click('[data-testid="edit-team-platform"]');
        await adminPage.fill('[name="teamName"]', 'Updated Platform');
        await adminPage.click('[data-testid="save-team"]');

        // Verify product page shows updated team name
        await page.reload();
        const updatedTeamName = await page.locator('[data-testid="owner-team"]').textContent();
        expect(updatedTeamName).not.toBe(initialTeamName);
    });
});
