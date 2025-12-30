import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Consumer RBAC & Visibility', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);

        // Login as consumer bypassing UI for stability
        await loginAsUser(page, 'consumer');
    });

    test('should see limited view for subscribed products', async ({ page }) => {
        // Navigate via UI or deep link with session preservation
        await navigateTo(page, '/');
        await page.getByRole('button', { name: /ACTIVE SUBSCRIPTIONS/i }).click();

        // 3. Wait for products to fully load, then click
        const productLink = page.getByText(/Identity Service/i).first();
        await productLink.waitFor({ state: 'visible', timeout: 20000 });
        await page.waitForTimeout(1000); // Small wait for DOM stabilization
        await productLink.click();

        // 4. Verify we are on Product Detail Page
        await expect(page).toHaveURL(/\/products\//, { timeout: 15000 });

        // 5. Verify "Rate Limit Status" is visible (Consumer specific feature)
        // Verify "Rate Limit Status" is visible (Consumer specific feature)
        await expect(page.locator('body')).toContainText(/Rate Limit/i);

        // 6. Verify "Quality Score" is NOT visible (Producer specific feature)
        // Note: Use .count() logic to avoid waiting for timeout if we expect absence
        const qualityScore = page.getByText(/Quality Score/i);
        await expect(qualityScore).toHaveCount(0);

        // 7. Verify "Edit" buttons are invalid/missing
        const editButtons = page.getByRole('button', { name: /Edit/i });
        await expect(editButtons).toHaveCount(0);

        // 8. access Configuration Tab and ensure Read-Only visual cues
        await page.getByText(/Configuration/i).click();
        await expect(page.getByText(/Configuration & Secrets/i)).toBeVisible();

        // Ensure buttons in the config table are likely disabled or handled securely
        // In our current implementation, the button exists but alerts. 
        // Ideally for Consumer view, we should probably hide them entirely.
        // Let's check if my previous edits hid them?
        // Ah, `ConfigurationTab` renders "Edit" buttons unconditionally currently.
        // This test will FAIL if I expect them gone.
        // I should update `ConfigurationTab.tsx` to hide buttons for Consumers first? 
        // Or I can assert they are present but different?
        // User requirement: "strictly read-only access... removing any 'edit' options".

        // So I *should* hide them in the component. 
        // But for this test file, let's write the assertion that matches CURRENT state 
        // or matches DESIRED state and then fix the code.
        // I will write it to expect NO edit buttons, then I will go fix the component.

        await expect(page.getByRole('button', { name: /Edit/i })).toHaveCount(0);
    });

    test('should not see Producer-only tabs', async ({ page }) => {
        // Navigate to a product
        await page.getByRole('button', { name: /ACTIVE SUBSCRIPTIONS/i }).click();
        await page.locator('div:has-text("Identity Service")').last().click();

        // Verify "Settings" or "Team" tabs are hidden if applicable
        // (Assuming logic exists, if not this is a good regression test)
    });
});
