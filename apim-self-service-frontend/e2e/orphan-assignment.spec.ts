
import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Orphan Product Assignment Flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        await loginAsUser(page, 'admin');
    });

    test('admin can see orphan products list', async ({ page }) => {
        await navigateTo(page, '/admin/governance');
        await expect(page.locator('body')).toContainText(/Platform Governance/i, { timeout: 15000 });
        await page.getByText(/Orphan Reclamation/i).first().click();

        // Wait for table to hydrate with actual data
        await expect(page.locator('body')).toContainText(/Orphaned \/ Legacy Products/i, { timeout: 15000 });
        await expect(page.locator('input[type="checkbox"]')).toHaveCount(4, { timeout: 10000 });
    });

    test('can assign orphans to a team', async ({ page }) => {
        await navigateTo(page, '/admin/governance');
        await page.getByText(/Orphan Reclamation/i).first().click();

        // Wait for list
        await expect(page.locator('input[type="checkbox"]').first()).toBeVisible({ timeout: 15000 });

        // Select an orphan
        await page.locator('input[type="checkbox"]').first().check();
        await page.locator('select').first().selectOption('team-payments');
        await page.getByRole('button', { name: /Assign Selected/i }).click();

        await expect(page.locator('text=/assigned successfully/i')).toBeVisible({ timeout: 10000 });
    });

    test('assignment emits event and updates context', async ({ page }) => {
        await navigateTo(page, '/admin/governance');
        await page.getByText(/Orphan Reclamation/i).first().click();

        // Wait for initial count reflecting mock data (4 orphans)
        await expect(page.locator('text=/Found/i')).toContainText('4', { timeout: 15000 });

        await page.locator('input[type="checkbox"]').first().check();
        await page.locator('select').first().selectOption('team-payments');
        await page.getByRole('button', { name: /Assign Selected/i }).click();

        // SUCCESS IS THE TRIGGER
        await expect(page.locator('text=/assigned successfully/i')).toBeVisible({ timeout: 10000 });

        // Count should update to 3 immediately after successful assignment
        await expect(page.locator('text=/Found/i')).toContainText('3', { timeout: 15000 });
    });
});
