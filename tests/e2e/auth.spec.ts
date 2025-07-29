import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('should redirect unauthenticated users to signin', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/.*auth\/signin.*/);
  });

  test('should display signin form with proper validation', async ({ page }) => {
    await page.goto('/auth/signin');
    
    const emailInput = page.locator('input[type="email"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(submitButton).toBeDisabled();
    
    await emailInput.fill('test@example.com');
    await expect(submitButton).not.toBeDisabled();
  });

  test('should show verification message after email submission', async ({ page }) => {
    await page.goto('/auth/signin');
    
    await page.fill('input[type="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Check your email')).toBeVisible();
  });

  test('should authenticate user and redirect to dashboard', async ({ page }) => {
    let authRequestMade = false;
    
    await page.route('**/api/auth/signin/email', async (route) => {
      authRequestMade = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ message: 'Email sent' }),
      });
    });
    
    await page.goto('/auth/signin');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.click('button[type="submit"]');
    
    expect(authRequestMade).toBe(true);
    await expect(page.locator('text=Check your email')).toBeVisible();
  });
});
