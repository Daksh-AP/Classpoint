import { test, expect } from '@playwright/test';

test('has title and renders welcome screen', async ({ page }) => {
  // Assuming the app runs on localhost:3000 during E2E tests
  await page.goto('http://localhost:3000');
  await expect(page).toHaveTitle(/Genatis/);
  
  // Wait for React to mount and show content
  const welcomeText = page.locator('text=Welcome to Genatis').first();
  await expect(welcomeText).toBeVisible({ timeout: 10000 });
});

