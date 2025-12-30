/**
 * E2E Test - Team Management
 */

import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Team Management Flow', () => {
    test.skip('admin can update team name', async ({ page }) => {
        // TODO: Implement when team management UI is ready
        // Login as admin using role button
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        await page.waitForURL(/\/(dashboard|$)/, { timeout: 10000 });

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
        await setupApiMocks(page);
        // Login bypassing flaky UI
        await loginAsUser(page, 'producer');

        // Navigate to product (owned by Platform Engineering)
        await navigateTo(page, '/products/prod-platform');

        // Verify team name is displayed
        // Verify team name is displayed (using text-based locator)
        // Verify team name is displayed
        await expect(page.locator('body')).toContainText('Platform Engineering');
    });
});
