import { test, expect, fillSignInForm, cleanupTestData } from './fixtures/test-helpers';

test.describe('Account Creation', () => {
  test.afterEach(async () => {
    await cleanupTestData();
  });

  test('should display sign in form on homepage', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Get started - it\'s free');
    await expect(page).toHaveURL(/.*auth\/signin.*/);
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('should submit email and show verification page', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    await fillSignInForm(page, testEmail);
    
    await expect(page.locator('text=Check your email')).toBeVisible();
    await expect(page.locator(`text=${testEmail}`)).toBeVisible();
  });

  test('should allow returning to sign in form', async ({ page }) => {
    const testEmail = `test-${Date.now()}@example.com`;
    await fillSignInForm(page, testEmail);
    
    await page.click('text=Send another email');
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="email"]')).toHaveValue('');
  });
});
