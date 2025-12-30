import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';

test.describe('Onboarding Page Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('should show products for Producer on Dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /PRODUCER/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });

        // Wait for ANY product card using text
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible({ timeout: 15000 });

        // Check if products are rendered
        const cards = page.locator('.group'); // Use group class which is on all cards
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should redirect Admin to Dashboard', async ({ page }) => {
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        // Admin goes to dashboard homepage
        await expect(page).toHaveURL('/', { timeout: 15000 });
        // Verify dashboard loads with search bar
        await expect(page.getByText(/Universal Search/i)).toBeVisible({ timeout: 20000 });
    });
});
