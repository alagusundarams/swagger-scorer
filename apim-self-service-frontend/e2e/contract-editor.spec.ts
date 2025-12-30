import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Contract Editor Interface', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        // Login as producer bypassing UI for stability
        await loginAsUser(page, 'producer');
    });

    test('should open editor, make changes and commit', async ({ page }) => {
        // Wait for dashboard to load
        await expect(page.getByText(/Universal Search/i)).toBeVisible();

        // Navigate via UI or deep link with session preservation
        await navigateTo(page, '/products/prod-001');

        // Wait for product details page
        await expect(page).toHaveURL(/.*products\/prod-001/, { timeout: 15000 });

        // Switch to APIS tab - increase timeout for page transition
        await page.getByRole('button', { name: /API Inventory/i }).click({ timeout: 20000 });

        // Find Charges & Voids API and click Edit Contract
        const editBtn = page.getByTestId('edit-contract-btn').first();
        await expect(editBtn).toBeVisible({ timeout: 10000 });
        await editBtn.click();

        // Verify Modal is open
        await expect(page.getByTestId('modal-title')).toContainText(/Edit Contract: Payments API/i);

        // Check Git Context Panel
        await expect(page.getByText(/portal.*payments-v1/i)).toBeVisible();

        // 1. Fill Commit Fields
        await page.getByPlaceholder(/Commit message/i).fill('Update API contract for stability');
        await page.getByPlaceholder(/Description/i).fill('Refactoring MFE and aligning E2E tests.');

        // 2. Click Commit Button
        const commitBtn = page.getByRole('button', { name: /Commit to Git/i });
        await expect(commitBtn).toBeEnabled();
        await commitBtn.click();

        // Modal should close
        await expect(page.getByText(/Edit Contract: Charges & Voids/i)).not.toBeVisible();
    });
});
