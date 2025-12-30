
import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Product Management Flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        await loginAsUser(page, 'producer');
    });

    test('producer can view product details', async ({ page }) => {
        await navigateTo(page, '/products/prod-001');
        await expect(page.locator('body')).toContainText(/Payment Gateway/i, { timeout: 15000 });
        await expect(page.locator('body')).toContainText(/Platform Engineering/i);
    });

    test('producer can view subscribers', async ({ page }) => {
        await navigateTo(page, '/products/prod-001');
        await expect(page.locator('body')).toContainText(/Payment Gateway/i, { timeout: 15000 });

        // Wait for tab and click
        const subTab = page.getByText('Subscribers').first();
        await expect(subTab).toBeVisible({ timeout: 10000 });
        await subTab.click();

        // Wait for subscriber list to hydrate
        await expect(page.locator('body')).toContainText(/Identity & Access|Mobile App Team/i, { timeout: 15000 });
    });

    test('product data refreshes after team update', async ({ page, context }) => {
        await navigateTo(page, '/products/prod-001');
        await expect(page.locator('body')).toContainText(/Platform Engineering/i, { timeout: 15000 });

        const adminPage = await context.newPage();
        // IMPORTANT: Do NOT reset state, we want to share the same "backend"
        await setupApiMocks(adminPage, { reset: false });
        await loginAsUser(adminPage, 'admin');

        await navigateTo(adminPage, '/admin/governance');
        await expect(adminPage.locator('body')).toContainText(/Platform Governance/i, { timeout: 15000 });
        await adminPage.getByText(/Orphan Reclamation/i).first().click();

        // Match checkboxes
        await expect(adminPage.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 10000 });
        await adminPage.locator('input[type="checkbox"]').first().check();
        await adminPage.locator('select').first().selectOption('team-payments');
        await adminPage.getByRole('button', { name: /Assign Selected/i }).click();

        // Success verification
        await expect(adminPage.locator('text=/assigned successfully/i').first()).toBeVisible({ timeout: 10000 });

        await page.bringToFront();
        await expect(page.locator('body')).toContainText(/Platform Engineering/i, { timeout: 15000 });
    });
});
