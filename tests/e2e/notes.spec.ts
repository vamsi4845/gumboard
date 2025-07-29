import { test, expect } from '@playwright/test';

test.describe('Note Management with Newlines', () => {
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

    await page.route('**/api/boards/test-board', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'test-board',
          name: 'Test Board',
          description: 'Test board for notes',
        }),
      });
    });

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      } else if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: postData.content,
              color: postData.color || '#fef3c7',
              done: false,
              isChecklist: false,
              createdBy: 'test-user',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            },
          }),
        });
      }
    });
  });

  test('should create a note with multiline content', async ({ page }) => {
    await page.goto('/boards/test-board');

    await page.click('button:has-text("+ Add Note")');
    
    const noteContent = 'Line 1\nLine 2\nLine 3';
    await page.fill('textarea[placeholder*="note content"]', noteContent);
    
    await page.click('button:has-text("Save Note")');
    
    await expect(page.locator('text=Line 1')).toBeVisible();
    await expect(page.locator('text=Line 2')).toBeVisible();
    await expect(page.locator('text=Line 3')).toBeVisible();
  });

  test('should preserve newlines in note content', async ({ page }) => {
    await page.goto('/boards/test-board');

    await page.click('button:has-text("+ Add Note")');
    
    const noteContent = 'First paragraph\n\nSecond paragraph\n\nThird paragraph';
    await page.fill('textarea[placeholder*="note content"]', noteContent);
    
    await page.click('button:has-text("Save Note")');
    
    const noteElement = page.locator('[data-testid="note-content"]').first();
    await expect(noteElement).toContainText('First paragraph');
    await expect(noteElement).toContainText('Second paragraph');
    await expect(noteElement).toContainText('Third paragraph');
  });

  test('should handle empty notes validation', async ({ page }) => {
    await page.goto('/boards/test-board');

    await page.click('button:has-text("+ Add Note")');
    
    const saveButton = page.locator('button:has-text("Save Note")');
    await expect(saveButton).toBeDisabled();
    
    await page.fill('textarea[placeholder*="note content"]', 'Valid content');
    await expect(saveButton).not.toBeDisabled();
  });

  test('should create note with different colors', async ({ page }) => {
    await page.goto('/boards/test-board');

    await page.click('button:has-text("+ Add Note")');
    await page.fill('textarea[placeholder*="note content"]', 'Colored note');
    
    await page.click('[data-testid="color-picker"] button[data-color="#fce7f3"]');
    await page.click('button:has-text("Save Note")');
    
    const noteElement = page.locator('[data-testid="note-card"]').first();
    await expect(noteElement).toHaveClass(/bg-pink/);
  });
});
