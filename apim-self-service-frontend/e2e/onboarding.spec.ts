import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';
import { loginAsUser, navigateTo } from './helpers/login';

test.describe('Onboarding Wizard Flow', () => {
    test.beforeEach(async ({ page }) => {
        await setupApiMocks(page);
        // Login as producer bypassing UI for stability
        await loginAsUser(page, 'producer');
    });

    test('should complete the onboarding wizard successfully', async ({ page }) => {
        // Navigate via UI or deep link with session preservation
        await navigateTo(page, '/');

        // Click Register New API
        await page.getByRole('link', { name: /\+ REGISTER NEW API/i }).click();
        await expect(page).toHaveURL('/onboard');

        // Step 1: Identity
        await expect(page.getByRole('heading', { name: 'Establish Identity' })).toBeVisible();
        await page.getByPlaceholder(/Payments Gateway/i).fill('My New API');
        await page.getByPlaceholder(/v1.0.0/i).fill('v1.0.0');
        await page.getByPlaceholder(/Describe your product/i).fill('This is a test description for the new API.');

        // Select Owner Team (Sarah is in team-payments)
        await page.locator('select').selectOption('team-payments');

        // Check if next button is enabled and click
        const identityNext = page.getByRole('button', { name: /Establish Identity/i });
        await expect(identityNext).toBeEnabled();
        await identityNext.click();

        // Step 2: API Specification (Spec Step)
        // Wait for Spec Step to load by checking for the uniquely identifying heading
        await expect(page.getByRole('heading', { name: /Define Contract/i })).toBeVisible({ timeout: 15000 });

        // Switch to URL import to avoid Monaco editor typing complexity
        await page.getByRole('button', { name: /url/i }).click();
        await page.getByPlaceholder(/https:\/\/raw.githubusercontent.com/i).fill('http://localhost:5174/api/v1/mock-spec.yaml');
        await page.getByRole('button', { name: /Import/i }).click();

        // Wait for analysis to complete (scorecard appears)
        await expect(page.getByText(/Ready to Submit/i)).toBeVisible({ timeout: 15000 });

        const visualizerNext = page.getByRole('button', { name: /Review & Submit/i });
        await expect(visualizerNext).toBeEnabled();
        await visualizerNext.click();

        // Step 3: Review
        await expect(page.getByText(/Step 3: Fulfillment/i).or(page.getByText(/Final Manifest/i))).toBeVisible();
        await expect(page.getByText('My New API')).toBeVisible();
        await expect(page.getByText('v1.0.0')).toBeVisible();

        // Final Submission
        const submitBtn = page.getByRole('button', { name: /Publish API/i });
        await submitBtn.click();

        // Should redirect back to dashboard or show success
        await expect(page.locator('body')).toContainText(/Success|Fulfillment/i);
    });
});
