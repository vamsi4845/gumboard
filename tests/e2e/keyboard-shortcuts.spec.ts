import { test, expect } from '@playwright/test';

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: { id: 'test-user', email: 'test@example.com', name: 'Test User' },
          expires: new Date(Date.now() + 86400000).toISOString(),
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-user',
          email: 'test@example.com',
          name: 'Test User',
          isAdmin: true,
          organization: { id: 'test-org', name: 'Test Organization', members: [] },
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ boards: [
            { id: 'board-1', name: 'Test Board', description: 'Test Description', createdBy: 'test-user' }
          ] }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-board', name: 'New Board', description: 'New Description' }),
        });
      }
    });

    await page.route('**/api/boards/board-1/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [
            { id: 'note-1', content: 'Test Note', boardId: 'board-1', createdBy: 'test-user' }
          ] }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'new-note', content: 'New Note', boardId: 'board-1' }),
        });
      }
    });

    await page.route('**/api/boards/board-1', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ id: 'board-1', name: 'Test Board', description: 'Test Description' }),
      });
    });
  });

  test('should focus search when Ctrl+K is pressed on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Control+k');
    
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeFocused();
  });

  test('should focus search when Cmd+K is pressed on dashboard (Mac)', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Meta+k');
    
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await expect(searchInput).toBeFocused();
  });

  test('should create new board when n is pressed on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('n');
    
    await expect(page.locator('text=Create New Board')).toBeVisible();
    await expect(page.locator('input[placeholder*="Enter board name"]')).toBeFocused();
  });

  test('should focus search when Ctrl+K is pressed on board page', async ({ page }) => {
    await page.goto('/boards/board-1');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Control+k');
    
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await expect(searchInput).toBeFocused();
  });

  test('should focus search when Cmd+K is pressed on board page (Mac)', async ({ page }) => {
    await page.goto('/boards/board-1');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Meta+k');
    
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await expect(searchInput).toBeFocused();
  });

  test('should create new note when n is pressed on board page', async ({ page }) => {
    await page.goto('/boards/board-1');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('n');
    
    await page.waitForTimeout(500);
    
    const noteInput = page.locator('textarea, input').filter({ hasText: '' }).first();
    await expect(noteInput).toBeVisible();
  });

  test('should focus search when / is pressed on board page', async ({ page }) => {
    await page.goto('/boards/board-1');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('/');
    
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await expect(searchInput).toBeFocused();
  });

  test('should show keyboard shortcuts help when Shift+? is pressed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Shift+?');
    
    await expect(page.locator('text=Keyboard Shortcuts')).toBeVisible();
    await expect(page.locator('text=Focus search')).toBeVisible();
    await expect(page.locator('text=Create new board')).toBeVisible();
  });

  test('should close modals when Escape is pressed', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('n');
    await expect(page.locator('text=Create New Board')).toBeVisible();
    
    await page.keyboard.press('Escape');
    await expect(page.locator('text=Create New Board')).not.toBeVisible();
  });

  test('should not trigger shortcuts when typing in input fields', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="Search boards"]');
    await searchInput.click();
    
    await page.keyboard.type('n');
    await expect(page.locator('text=Create New Board')).not.toBeVisible();
    
    await expect(searchInput).toHaveValue('n');
  });

  test('should filter boards when searching on dashboard', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Control+k');
    await page.keyboard.type('Test');
    
    await expect(page.locator('text=Test Board')).toBeVisible();
    
    await page.keyboard.selectAll();
    await page.keyboard.type('NonExistent');
    
    await expect(page.locator('text=No boards found')).toBeVisible();
  });

  test('should work with keyboard shortcuts on board page with existing notes', async ({ page }) => {
    await page.goto('/boards/board-1');
    await page.waitForLoadState('networkidle');
    
    await page.keyboard.press('Control+k');
    const searchInput = page.locator('input[placeholder*="Search notes"]');
    await expect(searchInput).toBeFocused();
    
    await page.keyboard.press('Escape'); // Clear any focus
    await page.keyboard.press('n');
    
    await page.waitForTimeout(500);
    const noteElements = page.locator('[data-testid="note"], textarea, input').filter({ hasText: '' });
    await expect(noteElements.first()).toBeVisible();
  });
});
