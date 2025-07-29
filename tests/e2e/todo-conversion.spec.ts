import { test, expect } from '@playwright/test';

test.describe('Note to Todo Conversion', () => {
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
          description: 'Test board for todos',
        }),
      });
    });

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'existing-note',
                content: 'Regular note content',
                color: '#fef3c7',
                done: false,
                isChecklist: false,
                createdBy: 'test-user',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
              },
            ],
          }),
        });
      } else if (route.request().method() === 'PUT') {
        const postData = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'existing-note',
              content: postData.content,
              color: postData.color || '#fef3c7',
              done: false,
              isChecklist: postData.isChecklist || false,
              checklistItems: postData.checklistItems || null,
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

  test('should convert a regular note to a checklist', async ({ page }) => {
    await page.goto('/boards/test-board');

    const noteCard = page.locator('[data-testid="note-card"]').first();
    await noteCard.hover();
    await noteCard.locator('[data-testid="note-actions"] button:has-text("Convert to Checklist")').click();
    
    await expect(page.locator('[data-testid="checklist-item"]')).toHaveCount(1);
    await expect(page.locator('input[type="checkbox"]')).toBeVisible();
  });

  test('should add checklist items to converted note', async ({ page }) => {
    await page.goto('/boards/test-board');

    const noteCard = page.locator('[data-testid="note-card"]').first();
    await noteCard.hover();
    await noteCard.locator('[data-testid="note-actions"] button:has-text("Convert to Checklist")').click();
    
    await page.click('button:has-text("+ Add Item")');
    await page.fill('[data-testid="checklist-input"]', 'New task item');
    await page.keyboard.press('Enter');
    
    await expect(page.locator('[data-testid="checklist-item"]')).toHaveCount(2);
    await expect(page.locator('text=New task item')).toBeVisible();
  });

  test('should mark checklist items as completed', async ({ page }) => {
    await page.goto('/boards/test-board');

    const noteCard = page.locator('[data-testid="note-card"]').first();
    await noteCard.hover();
    await noteCard.locator('[data-testid="note-actions"] button:has-text("Convert to Checklist")').click();
    
    const checkbox = page.locator('input[type="checkbox"]').first();
    await checkbox.check();
    
    await expect(checkbox).toBeChecked();
    await expect(page.locator('[data-testid="checklist-item"]').first()).toHaveClass(/line-through/);
  });

  test('should convert checklist back to regular note', async ({ page }) => {
    await page.goto('/boards/test-board');

    const noteCard = page.locator('[data-testid="note-card"]').first();
    await noteCard.hover();
    await noteCard.locator('[data-testid="note-actions"] button:has-text("Convert to Checklist")').click();
    
    await noteCard.hover();
    await noteCard.locator('[data-testid="note-actions"] button:has-text("Convert to Note")').click();
    
    await expect(page.locator('input[type="checkbox"]')).not.toBeVisible();
    await expect(page.locator('[data-testid="note-content"]')).toBeVisible();
  });
});
