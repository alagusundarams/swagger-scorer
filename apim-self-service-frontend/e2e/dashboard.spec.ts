import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';

test.describe('Dashboard End-to-End', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        // Clear storage to avoid state leakage
        await page.goto('/');
        await page.evaluate(() => localStorage.clear());

        // Login as PRODUCER for dashboard visibility
        await page.goto('/login');
        await page.getByRole('button', { name: /PRODUCER/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('should navigate through dashboard tabs', async ({ page }) => {
        // 1. Managed Products (Default)
        await expect(page.getByText(/MANAGED PRODUCTS/i)).toBeVisible();
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible();

        // 2. Active Subscriptions
        await page.getByText(/ACTIVE SUBSCRIPTIONS/i).click();
        await expect(page.getByText(/Identity Service/i).first()).toBeVisible();

        // 3. Approvals - increase timeout for slow rendering
        await page.getByText(/APPROVALS/i).click({ timeout: 20000 });
        await expect(page.getByText(/Audit Decisions/i)).toBeVisible({ timeout: 20000 });
        await expect(page.getByText(/Decision Queue/i)).toBeVisible({ timeout: 20000 });

        // 4. Global Inventory (Admin only - skip in this Producer-focused test as it's covered in visibility.spec.ts)
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
