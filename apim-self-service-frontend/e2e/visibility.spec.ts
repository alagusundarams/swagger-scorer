import { test, expect } from '@playwright/test';

test.describe('Dashboard Visibility', () => {
    test('should show products for Admin', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });

        // Wait for ANY product card
        // Based on the code, they have class "group" or "shadow-premium"
        const card = page.locator('.shadow-premium').first();
        await expect(card).toBeVisible({ timeout: 20000 });

        // Check if many products are rendered (Admin should see 112 mock products in Admin tab)
        // But the default tab is 'produced'.
        // Let's switch to Admin tab.
        await page.getByText(/ADMIN/i).click();

        const adminCards = page.locator('.shadow-premium');
        await expect(adminCards.first()).toBeVisible();
        const count = await adminCards.count();
        console.log(`Found ${count} admin cards`);
        expect(count).toBeGreaterThan(0);
    });
});
