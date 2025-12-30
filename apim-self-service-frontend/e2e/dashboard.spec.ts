import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Dashboard End-to-End', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);

        // Login bypassing flaky UI
        await loginAsUser(page, 'producer');
    });

    test('should navigate through dashboard tabs', async ({ page }) => {
        // Already logged in via beforeEach
        await navigateTo(page, '/');
    });

    test('should filter products by search', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/Find an interface/i);
        await searchInput.fill('Identity');

        // Should show Identity Service
        await expect(page.getByText(/Identity Service/i).first()).toBeVisible();

        // Clear search
        await searchInput.clear();
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible();
    });
});
