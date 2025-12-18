
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
    test('should redirect to login when unauthenticated', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveURL(/.*login/);
        await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
    });

    test('should login with SSO for company email', async ({ page }) => {
        await page.goto('/login');

        // Fill email
        await page.getByPlaceholder('Enter your email').fill('user@company.com');
        await page.getByRole('button', { name: 'Next' }).click();

        // In Mock Auth, login is instant, but component renders loading first.
        // Wait for redirect to dashboard
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Assert Dashboard Content by Unique Elements
        await expect(page.getByText('Universal Search')).toBeVisible();
        await expect(page.getByText('MANAGED PRODUCTS')).toBeVisible();
    });

    test('should allow navigation to Browse page', async ({ page }) => {
        // Login first
        await page.goto('/login');
        await page.getByPlaceholder('Enter your email').fill('user@company.com');
        await page.getByRole('button', { name: 'Next' }).click();
        await expect(page).toHaveURL('/', { timeout: 10000 });

        // Navigate to Active Subscriptions tab to see Browse link
        await page.getByText('ACTIVE SUBSCRIPTIONS').click();

        // Click Explore Ecosystem
        await page.getByRole('link', { name: /EXPLORE ECOSYSTEM/i }).click();

        // Verify Browse Page
        await expect(page).toHaveURL('/browse');
        await expect(page.getByPlaceholder('Find by name, capability, or owner...')).toBeVisible();
    });
});
