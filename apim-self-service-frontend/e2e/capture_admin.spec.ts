
import { test, expect } from '@playwright/test';

test('capture admin screenshots', async ({ page }) => {
    console.log('Capturing Admin Governance via UI Login...');

    // 1. Force a "Logout" by setting user to null if we could, but better to just hit Login if we can?
    // Actually, hitting /login might redirect to / if already logged in.
    // So we need to hit / and click Logout if present.

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

    // Wait for Login Page to load
    await page.getByRole('heading', { name: 'Sign in' }).waitFor({ state: 'visible', timeout: 10000 });

    // 2. Login as Admin
    console.log('Logging in as Admin...');
    // The button has "ADMIN" text
    await page.getByText('Portal Admin').click();

    // 3. Wait for Admin Governance Page (redirect happens automatically)
    await page.locator('text=Platform Governance').waitFor({ state: 'visible', timeout: 10000 });

    // Switch to Product Reclamation (Orphans)
    console.log('Switching to Product Reclamation...');
    await page.getByRole('button', { name: 'Product Reclamation' }).click();

    // Wait for table content
    await page.locator('text=Orphans Detected').waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText('Legacy Payment Service').waitFor({ state: 'visible', timeout: 5000 });

    // Ensure layout is stable
    await page.waitForTimeout(1000);

    console.log('Capturing Admin Governance Snapshot...');
    await page.screenshot({ path: '../docs/admin_governance_realistic.png', fullPage: true });
});
