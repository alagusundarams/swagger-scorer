
import { test } from '@playwright/test';

test('capture taylor screenshots', async ({ page }) => {
    console.log('Capturing Taylor Approval Queue...');

    // 1. Ensure fresh start (Logout if needed)
    await page.goto('http://localhost:5173/');

    // Check if logged in as someone else (e.g. Alex, Mike)
    // We want Taylor. If already Taylor, great. If not, logout.
    // If not logged in at all, login.

    // Check for Generic User Menu
    if (await page.locator('.user-menu-trigger').count() > 0) {
        console.log('User Menu found, logging out to ensure clean state...');
        await page.locator('.user-menu-trigger').click();
        await page.locator('.sign-out-button').click();
    }

    // Wait for Login Page
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ state: 'visible', timeout: 10000 });

    // Now at Login Page. Refresh to get Default User (Taylor)
    // As established, AuthProvider initializes default state on load.
    // So if we are at /login, reloading SHOULD (if local storage empty) reset to Taylor
    // BUT, we just logged out. If logout clears cookies/storage, then refresh works?
    // useAuth uses in-memory state. Refreshing browser KILLS memory state and re-inits default.

    console.log('Refreshing to reset state to Taylor (Default User)...');
    await page.reload();

    // Now verify we are Taylor
    // Wait for Dashboard
    await page.waitForTimeout(2000);

    // Navigate to Approvals tab
    await page.goto('http://localhost:5173/?tab=approvals');

    // Verify Tab is Active
    await page.getByText('Audit Decisions').waitFor({ state: 'visible', timeout: 10000 });

    // Check for Approval Item
    await page.getByText('Connor Consumer').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByRole('button', { name: 'Approve' }).waitFor({ state: 'visible', timeout: 10000 });

    console.log('Capturing Taylor Approval...');
    await page.screenshot({ path: '../docs/taylor_approval.png', fullPage: true });
});
