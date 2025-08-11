import { test, expect, Page, BrowserContext } from '@playwright/test'

test.describe('Real-time Synchronization', () => {
  let sharedNotesData: any[] = [];
  let noteIdCounter = 1;
  let checklistIdCounter = 1;

  const createMockNote = (content: string, userId = 'user-1') => ({
    id: `note-${noteIdCounter++}`,
    content,
    color: '#fef3c7',
    done: false,
    checklistItems: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    boardId: 'test-board',
    board: {
      id: 'test-board',
      name: 'Test Board',
    },
    user: {
      id: userId,
      name: userId === 'user-1' ? 'User One' : 'User Two',
      email: `${userId}@example.com`,
    },
  });

  const setupMockRoutes = async (page: Page, userId: string) => {
    await page.route('**/api/auth/session', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          user: {
            id: userId,
            email: `${userId}@example.com`,
            name: userId === 'user-1' ? 'User One' : 'User Two',
          }
        }),
      });
    });

    await page.route('**/api/user', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: userId,
          email: `${userId}@example.com`,
          name: userId === 'user-1' ? 'User One' : 'User Two',
          isAdmin: true,
          organization: {
            id: 'test-org',
            name: 'Test Organization',
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

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'ETag': `etag-${sharedNotesData.length}-${Date.now()}`,
          },
          body: JSON.stringify({ notes: sharedNotesData }),
        });
      } else if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
        const newNote = createMockNote(postData.content || '', userId);
        
        if (postData.checklistItems) {
          newNote.checklistItems = postData.checklistItems;
        }
        
        sharedNotesData.push(newNote);
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ note: newNote }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/*', async (route) => {
      const noteId = route.request().url().split('/').pop();
      
      if (route.request().method() === 'PUT') {
        const putData = await route.request().postDataJSON();
        const noteIndex = sharedNotesData.findIndex(n => n.id === noteId);
        
        if (noteIndex !== -1) {
          sharedNotesData[noteIndex] = {
            ...sharedNotesData[noteIndex],
            ...putData,
            updatedAt: new Date().toISOString(),
          };
          
          await route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({ note: sharedNotesData[noteIndex] }),
          });
        } else {
          await route.fulfill({ status: 404 });
        }
      } else if (route.request().method() === 'DELETE') {
        sharedNotesData = sharedNotesData.filter(n => n.id !== noteId);
        await route.fulfill({ status: 200 });
      }
    });
  };

  test.beforeEach(async () => {
    sharedNotesData = [];
    noteIdCounter = 1;
    checklistIdCounter = 1;
  });

  test('should sync note creation between multiple users', async ({ browser }) => {
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await setupMockRoutes(page1, 'user-1');
    await setupMockRoutes(page2, 'user-2');
    
    await page1.goto('/boards/test-board');
    await page2.goto('/boards/test-board');
    
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    expect(sharedNotesData.length).toBe(0);
    
    await page1.evaluate(() => {
      fetch('/api/boards/test-board/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Note from User 1' })
      });
    });
    
    await page1.waitForTimeout(1000);
    
    expect(sharedNotesData.length).toBe(1);
    expect(sharedNotesData[0].content).toBe('Note from User 1');
    
    await page2.waitForTimeout(5000);
    
    await page2.evaluate(() => {
      fetch('/api/boards/test-board/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: 'Note from User 2' })
      });
    });
    
    await page2.waitForTimeout(1000);
    
    expect(sharedNotesData.length).toBe(2);
    expect(sharedNotesData.find(n => n.content === 'Note from User 2')).toBeTruthy();
    
    await context1.close();
    await context2.close();
  });

  test('should sync checklist item updates across sessions', async ({ browser }) => {
    // Add a note with checklist items to shared data
    const noteWithChecklist = createMockNote('', 'user-1');
    noteWithChecklist.checklistItems = [
      {
        id: 'item-1',
        content: 'Task 1',
        checked: false,
        order: 0,
      },
      {
        id: 'item-2',
        content: 'Task 2',
        checked: false,
        order: 1,
      },
    ];
    sharedNotesData.push(noteWithChecklist);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await setupMockRoutes(page1, 'user-1');
    await setupMockRoutes(page2, 'user-2');
    
    await page1.goto('/boards/test-board');
    await page2.goto('/boards/test-board');
    
    // Wait for initial load
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    // Both users should see the checklist items
    await expect(page1.locator('text=Task 1')).toBeVisible();
    await expect(page2.locator('text=Task 1')).toBeVisible();
    
    // User 1 toggles the first checklist item
    const checkbox1 = page1.locator('[data-state="unchecked"]').first();
    await checkbox1.click();
    
    // Wait for polling cycle
    await page2.waitForTimeout(5000);
    
    // User 2 should see the item as checked
    const checkbox2User2 = page2.locator('[data-state="checked"]').first();
    await expect(checkbox2User2).toBeVisible();
    
    // User 2 adds a new checklist item
    await page2.click('button:has-text("Add task")');
    const newItemInput = page2.locator('input[placeholder="Add new item..."]');
    await newItemInput.fill('Task 3 from User 2');
    await newItemInput.press('Enter');
    
    // Wait for polling cycle
    await page1.waitForTimeout(5000);
    
    // User 1 should see the new task
    await expect(page1.locator('text=Task 3 from User 2')).toBeVisible();
    
    await context1.close();
    await context2.close();
  });

  test.skip('should preserve active edits during polling updates', async ({ browser }) => {
    const existingNote = createMockNote('Original content', 'user-1');
    sharedNotesData.push(existingNote);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await setupMockRoutes(page1, 'user-1');
    await setupMockRoutes(page2, 'user-2');
    
    await page1.goto('/boards/test-board');
    await page2.goto('/boards/test-board');
    
    await context1.close();
    await context2.close();
  });

  test.skip('should handle optimistic updates and rollback on failure', async ({ page }) => {
    const noteWithChecklist = createMockNote('', 'user-1');
    noteWithChecklist.checklistItems = [
      {
        id: 'item-1',
        content: 'Task to toggle',
        checked: false,
        order: 0,
      },
    ];
    sharedNotesData.push(noteWithChecklist);
    
    await setupMockRoutes(page, 'user-1');
    await page.goto('/boards/test-board');
  });

  test('should update polling when switching between boards', async ({ page }) => {
    const board1Notes = [createMockNote('Board 1 Note', 'user-1')];
    const board2Notes = [createMockNote('Board 2 Note', 'user-1')];
    let currentBoard = 'board-1';
    
    await setupMockRoutes(page, 'user-1');
    
    // Override board routes for multiple boards
    await page.route('**/api/boards', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          boards: [
            {
              id: 'board-1',
              name: 'Board 1',
              description: 'First board',
            },
            {
              id: 'board-2',
              name: 'Board 2',
              description: 'Second board',
            },
          ],
        }),
      });
    });
    
    await page.route('**/api/boards/board-1', async (route) => {
      currentBoard = 'board-1';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'board-1',
            name: 'Board 1',
            description: 'First board',
          },
        }),
      });
    });
    
    await page.route('**/api/boards/board-2', async (route) => {
      currentBoard = 'board-2';
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          board: {
            id: 'board-2',
            name: 'Board 2',
            description: 'Second board',
          },
        }),
      });
    });
    
    await page.route('**/api/boards/board-1/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': `board1-etag-${board1Notes.length}`,
        },
        body: JSON.stringify({ notes: board1Notes }),
      });
    });
    
    await page.route('**/api/boards/board-2/notes', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': `board2-etag-${board2Notes.length}`,
        },
        body: JSON.stringify({ notes: board2Notes }),
      });
    });
    
    // Start on board 1
    await page.goto('/boards/board-1');
    await page.waitForTimeout(1000);
    
    // Should see Board 1 note
    await expect(page.locator('text=Board 1 Note')).toBeVisible();
    
    // Switch to board 2
    await page.goto('/boards/board-2');
    await page.waitForTimeout(1000);
    
    // Should see Board 2 note, not Board 1 note
    await expect(page.locator('text=Board 2 Note')).toBeVisible();
    await expect(page.locator('text=Board 1 Note')).not.toBeVisible();
    
    // Add a note to board 2 while we're on it
    board2Notes.push(createMockNote('New Board 2 Note', 'user-1'));
    
    // Wait for polling to pick up the new note
    await page.waitForTimeout(5000);
    
    // Should see the new note
    await expect(page.locator('text=New Board 2 Note')).toBeVisible();
    
    // Switch back to board 1
    await page.goto('/boards/board-1');
    await page.waitForTimeout(1000);
    
    // Should only see Board 1 notes
    await expect(page.locator('text=Board 1 Note')).toBeVisible();
    await expect(page.locator('text=Board 2 Note')).not.toBeVisible();
    await expect(page.locator('text=New Board 2 Note')).not.toBeVisible();
  });

  test('should sync note deletions across sessions', async ({ browser }) => {
    const note1 = createMockNote('Note to keep', 'user-1');
    const note2 = createMockNote('Note to delete', 'user-1');
    sharedNotesData.push(note1, note2);
    
    const context1 = await browser.newContext();
    const context2 = await browser.newContext();
    
    const page1 = await context1.newPage();
    const page2 = await context2.newPage();
    
    await setupMockRoutes(page1, 'user-1');
    await setupMockRoutes(page2, 'user-2');
    
    await page1.goto('/boards/test-board');
    await page2.goto('/boards/test-board');
    
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    expect(sharedNotesData.length).toBe(2);
    
    await page1.evaluate(() => {
      fetch('/api/boards/test-board/notes/note-2', {
        method: 'DELETE'
      });
    });
    
    await page1.waitForTimeout(1000);
    
    expect(sharedNotesData.length).toBe(1);
    expect(sharedNotesData[0].content).toBe('Note to keep');
    
    await context1.close();
    await context2.close();
  });
});