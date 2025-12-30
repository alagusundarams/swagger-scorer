// Common E2E Test Helper for Login
// This helper uses the UI buttons for login to work with the current lack of localStorage persistence in production
// It also provides a robust way to navigate to deep links without triggering a page reload (which would lose the session)

import { Page, expect } from '@playwright/test';

export async function loginAsUser(page: Page, role: 'admin' | 'producer' | 'consumer') {
    // 1. Navigate to login
    await page.goto('/login');

    // 2. Wait for the login screen to be ready
    const roleButton = page.getByRole('button', { name: new RegExp(role, 'i') });
    await expect(roleButton).toBeVisible({ timeout: 15000 });

    // 3. Click the role button
    await roleButton.click();

    // 4. Wait for redirection to dashboard (URL changes to / or /dashboard)
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 15000 });

    // 5. Wait for the app to be fully hydrated (User info and Hero appear)
    await expect(page.getByRole('button', { name: /User Menu/i }).or(page.locator('.user-initial-avatar'))).toBeVisible({ timeout: 15000 });
    await expect(page.getByTestId('dashboard-hero').or(page.locator('body'))).toContainText(/Universal Search|Welcome/i, { timeout: 15000 });
}

/**
 * Navigate to a deep link WITHOUT reloading the page (preserves in-memory session)
 */
export async function navigateTo(page: Page, path: string) {
    await page.evaluate((targetPath) => {
        // We use window.history.pushState to update the URL
        window.history.pushState({}, '', targetPath);
        // We dispatch a popstate event to notify React Router to re-render
        window.dispatchEvent(new PopStateEvent('popstate'));
    }, path);

    // Verify we arrived
    await expect(page).toHaveURL(new RegExp(path), { timeout: 10000 });
}

export async function mockApiCalls(page: Page) {
    // This can be used for common API intercepts if needed
}
