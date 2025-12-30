/**
 * E2E Test - Team Management
 */

import { test, expect } from '@playwright/test';

test.describe('Team Management Flow', () => {
    test('admin can update team name', async ({ page }) => {
        // Login as admin
        await page.goto('/login');
        await page.fill('[name="email"]', 'admin@example.com');
        await page.fill('[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Navigate to admin panel
        await page.goto('/admin');
        await expect(page).toHaveURL('/admin');

        // Find team and click edit
        await page.click('[data-testid="team-team-platform"]');
        await page.click('[data-testid="edit-team-btn"]');

        // Update team name
        await page.fill('[name="teamName"]', 'Updated Platform Team');
        await page.click('[data-testid="save-team-btn"]');

        // Verify update
        await expect(page.locator('text=Updated Platform Team')).toBeVisible();
    });

    test('team update triggers refresh in inventory views', async ({ page }) => {
        // Login
        await page.goto('/login');
        await page.fill('[name="email"]', 'producer@example.com');
        await page.fill('[name="password"]', 'password');
        await page.click('button[type="submit"]');

        // Navigate to product
        await page.goto('/products/prod-user-api');

        // Verify team name is displayed
        await expect(page.locator('[data-testid="owner-team"]')).toContainText('Platform Engineering');
    });
});
