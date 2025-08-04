import { test, expect } from '@playwright/test';

test.describe('Single-Click Note Editing', () => {
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
          }
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
            description: 'A test board',
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
              description: 'A test board',
            },
          ],
        }),
      });
    });

    await page.goto('/boards/test-board');
  });

  test('should enter edit mode on single click for checklist notes', async ({ page }) => {
    let noteUpdateCalled = false;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-note-1',
                content: '',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Test checklist item',
                    checked: false,
                    order: 0
                  }
                ],
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

    await page.route('**/api/boards/test-board/notes/test-note-1', async (route) => {
      if (route.request().method() === 'PUT') {
        noteUpdateCalled = true;
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'test-note-1',
              content: '',
              color: '#fef3c7',
              done: false,
              isChecklist: true,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: requestBody.checklistItems,
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
    
    await expect(page.locator('text=Test checklist item')).toBeVisible();
    
    const checklistItemElement = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Test checklist item' });
    await checklistItemElement.click();
    
    await page.waitForTimeout(1000);
    
    const editInput = page.locator('input[value="Test checklist item"]');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Test checklist item');
  });

  test('should enter edit mode on single click for checklist items', async ({ page }) => {
    let noteUpdateCalled = false;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-checklist-note',
                content: '',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Test checklist item',
                    checked: false,
                    order: 0
                  }
                ],
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

    await page.route('**/api/boards/test-board/notes/test-checklist-note', async (route) => {
      if (route.request().method() === 'PUT') {
        noteUpdateCalled = true;
        const requestBody = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'test-checklist-note',
              content: '',
              color: '#fef3c7',
              done: false,
              isChecklist: true,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: requestBody.checklistItems,
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
    
    await expect(page.locator('text=Test checklist item')).toBeVisible();
    
    const checklistItemElement = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Test checklist item' });
    await checklistItemElement.click();
    
    await page.waitForTimeout(1000);
    
    const editInput = page.locator('input[value="Test checklist item"]');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Test checklist item');
  });

  test('should not enter edit mode when user is not authorized', async ({ page }) => {
    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'different-user',
          email: 'different@example.com',
          name: 'Different User',
          isAdmin: false,
          organization: {
            id: 'test-org',
            name: 'Test Organization',
          },
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
                id: 'test-note-1',
                content: '',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Test checklist item',
                    checked: false,
                    order: 0
                  }
                ],
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

    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=Test checklist item')).toBeVisible();
    
    const checklistItemElement = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Test checklist item' });
    await checklistItemElement.click();
    
    await page.waitForTimeout(500);
    
    const editInput = page.locator('input[value="Test checklist item"]');
    await expect(editInput).not.toBeVisible();
  });

  test('should save changes when editing checklist item content', async ({ page }) => {
    let savedChecklistItems: any[] = [];
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [
              {
                id: 'test-note-1',
                content: '',
                color: '#fef3c7',
                done: false,
                isChecklist: true,
                x: 100,
                y: 100,
                width: 200,
                height: 150,
                checklistItems: [
                  {
                    id: 'item-1',
                    content: 'Original item content',
                    checked: false,
                    order: 0
                  }
                ],
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

    await page.route('**/api/boards/test-board/notes/test-note-1', async (route) => {
      if (route.request().method() === 'PUT') {
        const requestBody = await route.request().postDataJSON();
        savedChecklistItems = requestBody.checklistItems;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'test-note-1',
              content: '',
              color: '#fef3c7',
              done: false,
              isChecklist: true,
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              checklistItems: requestBody.checklistItems,
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
    
    await expect(page.locator('text=Original item content')).toBeVisible();
    
    const checklistItemElement = page.locator('span.flex-1.text-sm.leading-6.cursor-pointer').filter({ hasText: 'Original item content' });
    await checklistItemElement.click();
    
    await page.waitForTimeout(500);
    
    const editInput = page.locator('input[value="Original item content"]');
    await expect(editInput).toBeVisible();
    await expect(editInput).toHaveValue('Original item content');
    
    await editInput.clear();
    await editInput.fill('Updated item content');
    await editInput.blur();
    
    await page.waitForTimeout(500);
    
    expect(savedChecklistItems).toHaveLength(1);
    expect(savedChecklistItems[0].content).toBe('Updated item content');
  });

});
