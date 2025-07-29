import { test, expect } from '@playwright/test'

test.describe('Note to Todo Conversion', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: 'test-user',
            email: 'test@example.com',
            name: 'Test User',
          },
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
          organization: {
            id: 'test-org',
            name: 'Test Organization',
          },
        }),
      });
    });

    await page.route('**/api/boards/test-board', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'test-board',
            name: 'Test Board',
            description: 'A test board for e2e testing',
          },
        }),
      });
    });

    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            {
              id: 'test-board',
              name: 'Test Board',
              description: 'A test board for e2e testing',
            },
          ],
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
                content: 'Buy milk\nBuy bread\nBuy eggs',
                color: '#fef3c7',
                done: false,
                isChecklist: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                user: {
                  id: 'test-user',
                  name: 'Test User',
                  email: 'test@example.com',
                },
              }
            ],
          }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/existing-note', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'existing-note',
              content: 'Buy milk\nBuy bread\nBuy eggs',
              color: '#fef3c7',
              done: false,
              isChecklist: true,
              checklistItems: [
                { id: 'item-1', content: 'Buy milk', checked: false, order: 0 },
                { id: 'item-2', content: 'Buy bread', checked: false, order: 1 },
                { id: 'item-3', content: 'Buy eggs', checked: false, order: 2 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          }),
        });
      }
    });
  });

  test('should convert note to checklist in database', async ({ page }) => {
    let conversionApiCalled = false;
    let convertedNoteData = null;
    
    await page.route('**/api/boards/test-board/notes/existing-note', async (route) => {
      if (route.request().method() === 'PUT') {
        conversionApiCalled = true;
        const requestBody = await route.request().postDataJSON();
        convertedNoteData = requestBody;
        
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'existing-note',
              content: 'Buy milk\nBuy bread\nBuy eggs',
              color: '#fef3c7',
              done: false,
              isChecklist: true,
              checklistItems: [
                { id: 'item-1', content: 'Buy milk', checked: false, order: 0 },
                { id: 'item-2', content: 'Buy bread', checked: false, order: 1 },
                { id: 'item-3', content: 'Buy eggs', checked: false, order: 2 }
              ],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
            },
          }),
        });
      }
    });
    
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Buy milk')).toBeVisible();
    await expect(page.locator('text=Buy bread')).toBeVisible();
    await expect(page.locator('text=Buy eggs')).toBeVisible();
    
    await page.hover('.group');
    await page.click('button[title="Convert to checklist"]');
    
    expect(conversionApiCalled).toBe(true);
    expect(convertedNoteData).toHaveProperty('isChecklist', true);
    
    const checkboxes = page.locator('input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);
    
    await checkboxes.first().check();
    await expect(checkboxes.first()).toBeChecked();
    
    await checkboxes.first().uncheck();
    await expect(checkboxes.first()).not.toBeChecked();
  });

  test('should handle note hover interactions', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Buy milk')).toBeVisible();
    
    await page.hover('.group');
    
    await expect(page.locator('button[title="Convert to checklist"]')).toBeVisible();
  });

  test('should verify conversion button functionality', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.hover('.group');
    
    const conversionButton = page.locator('button[title="Convert to checklist"]');
    await expect(conversionButton).toBeVisible();
    
    await conversionButton.click();
  });

  test('should verify conversion button exists and is clickable', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.hover('.group');
    
    const conversionButton = page.locator('button[title="Convert to checklist"]');
    await expect(conversionButton).toBeVisible();
    
    await conversionButton.click();
  });
});
