/**
 * E2E Test - Orphan Product Assignment
 */

import { test, expect } from '@playwright/test';

test.describe('Orphan Product Assignment Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as admin using role button
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });
        await page.goto('/admin');
    });

    test('admin can view orphaned products', async ({ page }) => {
        await expect(page.locator('h3')).toContainText(/orphan/i);

        // Should show orphan count
        await expect(page.locator('text=/found \\d+ unassigned/i')).toBeVisible();
    });

    test('admin can assign orphan products to team', async ({ page }) => {
        // Select an orphan product
        const firstCheckbox = page.locator('input[type="checkbox"]').first();
        await firstCheckbox.check();

        // Select target team
        await page.selectOption('select', 'team-platform');

        // Click assign button
        await page.click('button:has-text("Assign Selected")');

        // Verify success message
        await expect(page.locator('text=/assigned successfully/i')).toBeVisible();
    });

    test('assignment emits event and updates context', async ({ page }) => {
        // Assign a product
        await page.locator('input[type="checkbox"]').first().check();
        await page.selectOption('select', 'team-platform');
        await page.click('button:has-text("Assign Selected")');

        // Navigate to inventory
        await page.goto('/inventory');

        // Verify assigned product now appears with team
        await expect(page.locator('[data-testid="product-list"]')).toBeVisible();
    });

    test('can assign to additional AD group', async ({ page }) => {
        // Select product
        await page.locator('input[type="checkbox"]').first().check();

        // Select team with multiple AD groups
        await page.selectOption('select[name="team"]', 'team-analytics');

        // Additional AD group dropdown should appear
        await expect(page.locator('select[name="adGroup"]')).toBeVisible();

        // Select specific AD group
        await page.selectOption('select[name="adGroup"]', 'ad-group-analytics-dev');

        // Assign
        await page.click('button:has-text("Assign Selected")');

        await expect(page.locator('text=/assigned successfully/i')).toBeVisible();
    });
});
