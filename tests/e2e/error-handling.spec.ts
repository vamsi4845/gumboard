import { test, expect } from '@playwright/test';

test.describe('Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com',
          },
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com',
            isAdmin: true,
            organization: {
              id: 'test-org',
              name: 'Test Organization',
              members: [],
            },
          },
        }),
      });
    });
  });

  test('should handle 500 server errors gracefully', async ({ page }) => {
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal server error' }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page.locator('text=No boards yet')).toBeVisible({ timeout: 10000 });
  });

  test('should handle 401 authentication errors', async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Unauthorized' }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*auth.*signin/);
  });

  test('should handle 403 authorization errors for board access', async ({ page }) => {
    await page.route('**/api/boards/restricted-board', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied' }),
      });
    });

    await page.route('**/api/boards/restricted-board/notes', async (route) => {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Access denied' }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/boards/restricted-board');
    
    await expect(page.locator('text=Loading')).toBeVisible({ timeout: 10000 });
  });

  test('should handle 404 board not found errors', async ({ page }) => {
    await page.route('**/api/boards/nonexistent-board', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Board not found' }),
      });
    });

    await page.route('**/api/boards/nonexistent-board/notes', async (route) => {
      await route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Board not found' }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/boards/nonexistent-board');
    
    await expect(page.locator('text=Loading')).toBeVisible({ timeout: 10000 });
  });

  test('should handle network timeout errors', async ({ page }) => {
    await page.route('**/api/boards', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ boards: [] }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page.locator('text=No boards yet')).toBeVisible({ timeout: 10000 });
  });

  test('should handle invalid JSON responses', async ({ page }) => {
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: 'invalid json response',
      });
    });

    await page.goto('/dashboard');
    
    await expect(page.locator('text=No boards yet')).toBeVisible({ timeout: 10000 });
  });


  test('should handle API error responses gracefully', async ({ page }) => {
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Database connection failed' }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page.locator('text=No boards yet')).toBeVisible({ timeout: 10000 });
  });

  test('should handle session expiration during API calls', async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Session expired' }),
      });
    });

    await page.goto('/dashboard');
    
    await expect(page).toHaveURL(/.*auth.*signin/);
  });
});
