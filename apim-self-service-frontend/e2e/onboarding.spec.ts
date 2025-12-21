import { test, expect } from '@playwright/test';

test.describe('Onboarding Wizard Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByPlaceholder('Enter your email').fill('user@company.com');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL('/', { timeout: 10000 });
    });

    test('should complete the onboarding wizard successfully', async ({ page }) => {
        // Click Register New API
        await page.getByRole('link', { name: /\+ REGISTER NEW API/i }).click();
        await expect(page).toHaveURL('/onboard');

        // Step 1: Identity
        await expect(page.getByText('Product Identity')).toBeVisible();
        await page.getByPlaceholder(/Global Transactions API/i).fill('My New API');
        await page.getByPlaceholder(/v1.0.0/i).fill('v1.0.0');
        await page.getByPlaceholder(/Summarize the core capabilities/i).fill('This is a test description for the new API.');

        // Check if next button is enabled and click
        const identityNext = page.getByRole('button', { name: /Establish Identity/i });
        await expect(identityNext).toBeEnabled();
        await identityNext.click();

        // Step 2: Exposure Control
        await expect(page.getByText('Exposure Control')).toBeVisible();
        await page.getByLabel(/Restricted Circle/i).check();

        // Team search should appear
        await expect(page.getByPlaceholder(/Search teams by name/i)).toBeVisible();

        const visibilityNext = page.getByRole('button', { name: /Review Manifest/i });
        await visibilityNext.click();

        // Step 3: Review
        await expect(page.getByText('Final Manifest')).toBeVisible();
        await expect(page.getByText('My New API')).toBeVisible();
        await expect(page.getByText('v1.0.0')).toBeVisible();

        // Final Submission
        const submitBtn = page.getByRole('button', { name: /Submit Registration/i });
        await submitBtn.click();

        // Should redirect back to dashboard or show success (Mocked behavior redirect to /)
        await expect(page).toHaveURL('/');
    });
});
