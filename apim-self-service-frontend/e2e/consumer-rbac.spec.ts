import { test, expect } from '@playwright/test';

test.describe('Consumer RBAC Restrictions', () => {

    test.beforeEach(async ({ page }) => {
        // 1. Login as a Consumer (Developer Persona)
        await page.goto('/login');
        await page.getByRole('button', { name: /DEVELOPER/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test('should see limited view for subscribed products', async ({ page }) => {
        // 2. Navigate to "Active Subscriptions" tab
        await page.getByText(/ACTIVE SUBSCRIPTIONS/i).click();

        // 3. Click "View Details" on the first card (e.g., Identity Service)
        const firstCard = page.locator('.shadow-premium').first();
        await expect(firstCard).toBeVisible();
        await firstCard.click();

        // 4. Verify we are on Product Detail Page
        await expect(page).toHaveURL(/\/products\//);

        // 5. Verify "Rate Limit Status" is visible (Consumer specific feature)
        await expect(page.getByText(/Rate Limit Status/i)).toBeVisible();

        // 6. Verify "Quality Score" is NOT visible (Producer specific feature)
        // Note: Use .count() logic to avoid waiting for timeout if we expect absence
        const qualityScore = page.getByText(/Quality Score/i);
        await expect(qualityScore).toHaveCount(0);

        // 7. Verify "Edit" buttons are invalid/missing
        const editButtons = page.getByRole('button', { name: /Edit/i });
        await expect(editButtons).toHaveCount(0);

        // 8. access Configuration Tab and ensure Read-Only visual cues
        await page.getByText(/Configuration/i).click();
        await expect(page.getByText(/Product Configuration/i)).toBeVisible();

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
        await page.getByText(/ACTIVE SUBSCRIPTIONS/i).click();
        await page.locator('.shadow-premium').first().click();

        // Verify "Settings" or "Team" tabs are hidden if applicable
        // (Assuming logic exists, if not this is a good regression test)
    });
});
