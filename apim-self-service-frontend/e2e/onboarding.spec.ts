import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';

test.describe('Onboarding Wizard Flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        // Login as PRODUCER to register APIs
        await page.goto('/login');
        await page.getByRole('button', { name: /PRODUCER/i }).click();
        await expect(page).toHaveURL('/', { timeout: 15000 });
    });

    test.skip('should complete the onboarding wizard successfully', async ({ page }) => {
        // TODO: Fix when onboarding form team select options are populated
        // Click Register New API
        await page.getByRole('link', { name: /\+ REGISTER NEW API/i }).click();
        await expect(page).toHaveURL('/onboard');

        // Step 1: Identity
        await expect(page.getByRole('heading', { name: 'Establish Identity' })).toBeVisible();
        await page.getByPlaceholder(/Payments Gateway/i).fill('My New API');
        await page.getByPlaceholder(/v1.0.0/i).fill('v1.0.0');
        await page.getByPlaceholder(/Describe your product/i).fill('This is a test description for the new API.');

        // Select Owner Team (FinTech Core is t1)
        await page.locator('select').selectOption('t1');

        // Check if next button is enabled and click
        const identityNext = page.getByRole('button', { name: /Establish Identity/i });
        await expect(identityNext).toBeEnabled();
        await identityNext.click();

        // Step 2: Policy Studio (Visualizer)
        // Wait for Visualizer to load by checking for the header OR the loading state
        await expect(page.getByText(/Visualizer/i).or(page.getByText(/Loading Visualizer/i))).toBeVisible({ timeout: 15000 });

        const visualizerNext = page.getByRole('button', { name: /Continue to Review/i });
        await expect(visualizerNext).toBeVisible({ timeout: 10000 });
        await visualizerNext.click();

        // Step 3: Review
        await expect(page.getByText(/Step 3: Fulfillment/i).or(page.getByText(/Final Manifest/i))).toBeVisible();
        await expect(page.getByText('My New API')).toBeVisible();
        await expect(page.getByText('v1.0.0')).toBeVisible();

        // Final Submission
        const submitBtn = page.getByRole('button', { name: /Publish API/i });
        await submitBtn.click();

        // Should redirect back to dashboard or show success (Mocked behavior redirect to /)
        await expect(page).toHaveURL('/');
    });
});
