import { test, expect } from '@playwright/test';

test.describe('Swagger Scorer Analysis Flow', () => {
    test.beforeEach(async ({ page }) => {
        // Go to the starting url before each test.
        await page.goto('/');
    });

    test('should analyze a valid OpenAPI spec entered via Monaco Editor', async ({ page }) => {
        // 1. Verify page title or header
        await expect(page).toHaveTitle(/Swagger Scorer/);
        await expect(page.getByRole('heading', { name: 'Swagger Scorer', level: 1 })).toBeVisible();

        // 2. Locate the Monaco Editor
        // Monaco doesn't use standard input/textarea, so we click the container to focus
        // The container is the .monaco-editor div, typically found by class or role
        // We'll click the center of the editor area
        const editor = page.locator('.monaco-editor .view-lines').first();
        await expect(editor).toBeVisible();
        await editor.click();

        // 3. Clear existing content (if any) and type new spec
        // Control+A -> Backspace to clear
        await page.keyboard.press('Control+A');
        await page.keyboard.press('Backspace');

        // Use minimal valid JSON to avoid editor indentation issues in headless mode
        const validSpec = JSON.stringify({
            openapi: '3.0.0',
            info: { title: 'Test API', version: '1.0.0' },
            paths: {}
        });

        // Type the minimal spec - type() mimics keystrokes which usually triggers Monaco better than insertText
        await page.keyboard.type(validSpec);

        // Wait for editor to settle
        await page.waitForTimeout(500);

        // 4. Click Analyze
        const analyzeButton = page.getByRole('button', { name: 'Analyze Specification' });
        await expect(analyzeButton).toBeEnabled();
        await analyzeButton.click();

        // 5. Verify Results
        // Wait for the results to appear (Score Card)
        await expect(page.getByText('Overall Quality Score')).toBeVisible({ timeout: 10000 });

        // Check for a score (should be visible and a number)
        const scoreElement = page.locator('div.text-6xl.font-bold');
        await expect(scoreElement).toBeVisible();

        // 6. Verify Collapsible Violations
        // Check for "Expand All" button and click it
        const expandAllBtn = page.getByRole('button', { name: 'Expand All' });
        await expect(expandAllBtn).toBeVisible();
        await expandAllBtn.click();

        // After expanding, check if "Collapse All" is visible
        await expect(page.getByRole('button', { name: 'Collapse All' })).toBeVisible();

        // Check for "Test API" in the document (simple content check)
        // Note: Our UI might not display the title, but it shows the score.
    });

    test('should show error for empty input', async ({ page }) => {
        const analyzeButton = page.getByRole('button', { name: 'Analyze Specification' });

        // Depending on logic, it might be disabled
        // Code says: disabled={isLoading || !spec.trim()}
        await expect(analyzeButton).toBeDisabled();
    });
});
