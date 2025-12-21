import { test, expect } from '@playwright/test';

test.describe('Contract Editor Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login as ADMIN
        await page.goto('/login');
        await page.getByRole('button', { name: /ADMIN/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('should open editor, make changes and commit', async ({ page }) => {
        // Wait for dashboard to load
        await expect(page.getByText(/Universal Search/i)).toBeVisible();

        // Find Payment Gateway product card and click View Details
        // Use a more relaxed selector for the card
        const productCard = page.locator('div').filter({ hasText: /Payment Gateway/i }).last();
        await expect(productCard).toBeVisible({ timeout: 15000 });

        // Click View Details button
        await productCard.getByRole('button', { name: /View Details/i }).click();

        // Wait for product details page
        await expect(page).toHaveURL(/.*products\/prod-001/, { timeout: 15000 });

        // Find Charges & Voids API and click Edit Contract
        // In the detail page, it might be a button with label "Edit Contract"
        const editBtn = page.getByRole('button', { name: /Edit Contract/i }).first();
        await expect(editBtn).toBeVisible();
        await editBtn.click();

        // Verify Modal is open
        await expect(page.getByText(/Edit Contract: Charges & Voids/i)).toBeVisible();

        // Check Git Context Panel
        await expect(page.getByText(/portal\/charges-api/i)).toBeVisible();

        // Commit change
        const commitInput = page.getByPlaceholder(/Describe your changes/i);
        await commitInput.fill('E2E Test Commit');

        const commitBtn = page.getByRole('button', { name: /Commit & Push/i });
        await expect(commitBtn).toBeEnabled();

        await commitBtn.click();

        // Modal should close
        await expect(page.getByText(/Edit Contract: Charges & Voids/i)).not.toBeVisible();
    });
});
