import { test } from '@playwright/test';

test('capture producer screenshots', async ({ page }) => {
    // Paula Step 1
    console.log('Capturing Onboarding Step 1...');
    await page.goto('http://localhost:5174/onboard');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: '../docs/paula_onboarding_step1.png', fullPage: true });

    // Paula Step 2: Navigate to Identity
    console.log('Interacting with Prerequisities...');
    await page.locator('text=Identity & Auth').click();
    await page.locator('text=Configuration').click();
    await page.locator('text=Governance').click();

    await page.getByRole('button', { name: 'Start My Journey' }).click();

    await page.waitForTimeout(1000);
    console.log('Selecting New Product intent...');
    await page.locator('text=Start Fresh').click();

    // Verify we are on Step 2
    try {
        await page.locator('h2:has-text("Establish Identity")').waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
        console.log('Step 2 Header not found, dumping page text...');
        console.log(await page.locator('body').innerText());
        throw e;
    }

    // Now we should be on Step 2 (Identity)
    await page.waitForTimeout(1000);
    console.log('Capturing Onboarding Step 2 (Identity)...');
    await page.screenshot({ path: '../docs/paula_onboarding_step2.png', fullPage: true });

    // Step 2: Fill Identity
    console.log('Filling Identity Form...');
    // Use generic selectors if placeholders are brittle, but here we see them in code.
    await page.fill('input[placeholder="e.g. Payments_Gateway"]', 'Customer-Profile-API');
    await page.fill('input[placeholder="v1.0.0"]', 'v1');
    await page.fill('textarea', 'Provides customer profile data.');

    // Select Team (required)
    await page.locator('select').selectOption({ index: 1 }); // Select first available team

    // Handle Identity Search (Required for validation)
    console.log('Searching for App Identity...');
    // Type "Customer" to match mock data
    const identityInput = page.locator('input[placeholder="Search application name or ID..."]');
    await identityInput.click(); // Ensure focus
    await identityInput.fill('Customer');

    // Wait for specific result
    const resultLocator = page.locator('text=Customer-Profile-Identity');
    await resultLocator.waitFor({ state: 'visible', timeout: 5000 });
    await resultLocator.click();

    // Verify button is enabled and click
    await page.waitForTimeout(1000);
    const nextBtn = page.getByRole('button', { name: 'Establish Identity' });
    if (await nextBtn.isEnabled()) {
        await nextBtn.click();
    } else {
        console.error('Next button still disabled!');
    }

    // Now we should be on Step 3
    await page.waitForTimeout(2000);
    console.log('Capturing Onboarding Step 3 (Quality/Spec)...');
    // Step 3: Spec Studio Interaction (Upload Method)
    console.log('Interacting with Spec Studio (Upload)...');
    await page.fill('input[placeholder="e.g. Orders-API"]', 'Customer-Profile-API');
    await page.locator('input[placeholder="orders"]').fill('customer-profile');

    // Upload the valid spec file
    // The SpecStudio default view is "Upload", so we just need to target the file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles('temp_valid_spec.yaml');

    // Wait for analysis to kick in (debounce)
    await page.waitForTimeout(2000);

    // Verify "VALIDATED" appears - CRITICAL
    try {
        await page.locator('text=VALIDATED').waitFor({ state: 'visible', timeout: 15000 });
        console.log('Validation SUCCESS - Validated text found.');
    } catch (e) {
        console.error('Validation FAILED - text not found.');
        throw e; // Fail the test if we don't get the validated state
    }

    console.log('Capturing Onboarding Step 3 (Quality/Spec)...');
    await page.screenshot({ path: '../docs/paula_onboarding_step3_quality.png', fullPage: true });

    // Step 4: Policy Configuration
    console.log('Navigating to Policy Step...');
    await page.getByRole('button', { name: 'Continue to Policies' }).click();

    // Wait for Unified Policy Studio
    await page.locator('text=Unified Policy Studio').waitFor({ state: 'visible', timeout: 10000 });

    // Interact: Add Rate Limit Policy
    console.log('Adding Rate Limit Policy...');
    // Palette uses 'p' tag for name, so we click that
    await page.locator('button').filter({ hasText: 'Rate Limit' }).first().click();

    // Wait for the policy to appear in the flow (Renderer uses 'h3' for name)
    // This distinguishes the added card from the palette button
    await page.locator('h3').filter({ hasText: 'Rate Limit' }).waitFor({ state: 'visible', timeout: 5000 });

    console.log('Capturing Onboarding Step 4 (Policy)...');
    await page.screenshot({ path: '../docs/paula_onboarding_step4_policy.png', fullPage: true });
});
