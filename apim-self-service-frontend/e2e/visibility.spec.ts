import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Onboarding Page Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
    });

    test('should show products for Producer on Dashboard', async ({ page }) => {
        await loginAsUser(page, 'producer');
        await navigateTo(page, '/');

        // Wait for ANY product card using text
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible({ timeout: 15000 });

        // Check if products are rendered
        const cards = page.locator('.group'); // Use group class which is on all cards
        const count = await cards.count();
        expect(count).toBeGreaterThan(0);
    });

    test('should redirect Admin to Dashboard', async ({ page }) => {
        await loginAsUser(page, 'admin');
        // Verify dashboard loads with search bar
        await expect(page.getByText(/Universal Search/i)).toBeVisible({ timeout: 20000 });
    });
});
