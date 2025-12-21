import { test, expect } from '@playwright/test';

test.describe('Dashboard End-to-End', () => {
    test.beforeEach(async ({ page }) => {
        // Login as ADMIN to have maximum visibility
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('should navigate through dashboard tabs', async ({ page }) => {
        // 1. Managed Products (Default)
        await expect(page.getByText(/MANAGED PRODUCTS/i)).toBeVisible();
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible();

        // 2. Active Subscriptions
        await page.getByText(/ACTIVE SUBSCRIPTIONS/i).click();
        await expect(page.getByText(/Identity Service/i).first()).toBeVisible();

        // 3. Pending Approvals
        await page.getByText(/PENDING APPROVALS/i).click();
        await expect(page.getByText(/Audit Decisions/i)).toBeVisible();
        await expect(page.getByText(/Decision Queue/i)).toBeVisible();

        // 4. Global Inventory (Admin only)
        await page.getByText(/GLOBAL INVENTORY/i).click();
        await expect(page.getByText(/Enterprise/i).first()).toBeVisible();
    });

    test('should filter products by search', async ({ page }) => {
        const searchInput = page.getByPlaceholder(/Universal Search/i);
        await searchInput.fill('Identity');

        // Should show Identity Service
        await expect(page.getByText(/Identity Service/i).first()).toBeVisible();

        // Clear search
        await searchInput.fill('');
        await expect(page.getByText(/Payment Gateway/i).first()).toBeVisible();
    });
});
