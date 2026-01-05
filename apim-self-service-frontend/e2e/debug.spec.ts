import { test, expect } from '@playwright/test';
import { setupApiMocks } from './utils/api-mocker';

test('debug dashboard hydration', async ({ page }) => {
    await setupApiMocks(page);
    await page.goto('/login');

    // 1. Screenshot login
    await page.screenshot({ path: 'test-results/debug-login.png' });

    // 2. Click producer
    const roleButton = page.getByRole('button', { name: /producer/i });
    await roleButton.click();

    // 3. Wait for URL
    await expect(page).toHaveURL(/\/(dashboard|$)/, { timeout: 15000 });

    // 4. Wait a bit for React
    await page.waitForTimeout(2000);

    // 5. Screenshot result
    await page.screenshot({ path: 'test-results/debug-dashboard.png' });

    // 6. Check DOM
    const html = await page.content();
    console.log('DOM CONTENT Snippet:', html.substring(0, 1000));

    // 7. Check for User Menu
    const userMenu = page.locator('.user-initial-avatar').first();
    const isVisible = await userMenu.isVisible();
    console.log('User Menu Visible:', isVisible);
});
