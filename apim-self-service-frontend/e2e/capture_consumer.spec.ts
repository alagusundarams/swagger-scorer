
import { test } from '@playwright/test';

test('capture consumer screenshots', async ({ page }) => {
    console.log('Capturing Consumer Search/Catalog...');

    // 1. Ensure fresh start (Logout if logged in)
    await page.goto('http://localhost:5173/');

    // 1. Ensure fresh start (Logout if logged in)
    await page.goto('http://localhost:5173/');
    await page.waitForTimeout(1000); // Wait for hydration

    // Check for Generic User Menu
    if (await page.locator('.user-menu-trigger').count() > 0) {
        console.log('User Menu found, logging out...');
        await page.locator('.user-menu-trigger').click();
        await page.locator('.sign-out-button').click();
    }

    // Wait for Login Page
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ state: 'visible', timeout: 10000 });

    // 2. Login as Consumer
    console.log('Logging in as Consumer...');
    await page.getByText('Mike (Core Sys)').click(); // Button text from LoginPage.tsx

    // 3. Navigate to Browse (after login redirect to dashboard)
    await page.waitForTimeout(1000); // Wait for redirect
    await page.goto('http://localhost:5173/browse');

    // 4. Search Flow
    await page.fill('input[placeholder="Find by name, capability, or owner..."]', 'Customer');

    // Wait for the Customer Profile API card to appear
    await page.getByText('Customer Profile API').waitFor({ state: 'visible', timeout: 5000 });

    await page.waitForTimeout(1000); // Visual stability
    console.log('Capturing Connor Search...');
    await page.screenshot({ path: '../docs/connor_search.png', fullPage: true });
});
