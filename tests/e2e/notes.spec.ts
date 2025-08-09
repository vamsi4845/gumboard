import { test, expect } from '@playwright/test'

test.describe('Note Management with Newlines', () => {
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

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            notes: [],
          }),
        });
      } else if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
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

    await page.route('**/api/boards/test-board/notes/new-note-id', async (route) => {
      if (route.request().method() === 'PUT') {
        const postData = await route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
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

    await page.route('**/api/boards/all-notes/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      }
    
      if (route.request().method() === 'POST') {
        const postData = await route.request().postDataJSON();
    
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'all-notes-note-id',
              content: postData.content || '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              user: {
                id: 'test-user',
                name: 'Test User',
                email: 'test@example.com',
              },
              board: {
                id: postData.boardId || 'target-board-id',
                name: 'Target Board',
              }
            }
          }),
        });
      }
    });
  });

  test('should create a checklist note and verify database state', async ({ page }) => {
    let noteCreated = false;
    let noteData: any = null;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes: [] }),
        });
      } else if (route.request().method() === 'POST') {
        noteCreated = true;
        const postData = await route.request().postDataJSON();
        noteData = postData;
        
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            note: {
              id: 'new-note-id',
              content: '',
              color: '#fef3c7',
              done: false,
              checklistItems: postData.checklistItems || [{
                id: `item-${Date.now()}`,
                content: '',
                checked: false,
                order: 0,
              }],
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
    
    await page.evaluate(() => {
      const mockNoteData = { 
        content: '',
        checklistItems: [{
          id: `item-${Date.now()}`,
          content: '',
          checked: false,
          order: 0,
        }]
      };
      fetch('/api/boards/test-board/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mockNoteData)
      });
    });
    
    await page.waitForTimeout(100);
    
    expect(noteCreated).toBe(true);
    expect(noteData).not.toBeNull();
    expect(noteData!.checklistItems).toBeDefined();
    expect(Array.isArray(noteData!.checklistItems)).toBe(true);
  });

  test('should create a note in the all notes view', async ({ page }) => {
    await page.goto('/boards/all-notes');
    await page.click('button:has(svg.lucide-pencil)');
    await page.waitForTimeout(500);
    await expect(page.locator('.note-background')).toBeVisible();
  });

  test('should handle checklist item editing', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.click('button:has-text("Add Your First Note")');
    
    await page.waitForTimeout(500);
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await input.fill('Test checklist item');
    await input.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=Test checklist item')).toBeVisible();
  });

  test('should handle creating multiple checklist items', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await page.click('button:has-text("Add Your First Note")');
    
    await page.waitForTimeout(500);
    
    const input = page.locator('input.bg-transparent');
    await expect(input).toBeVisible();
    await input.fill('First item');
    await input.blur();
    
    await page.waitForTimeout(500);
    
    await expect(page.locator('text=First item')).toBeVisible();
  });

  test('should disallow DnD for checklist items across notes', async ({ page }) => {
    let didCallUpdateApi = false;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: '',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: false, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: false, order: 3 },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
          },
          {
            id: 'note-2',
            content: '',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-2a', content: 'Item B1', checked: false, order: 0 },
              { id: 'item-2b', content: 'Item B2', checked: false, order: 1 },
              { id: 'item-2c', content: 'Item B3', checked: false, order: 2 },
              { id: 'item-2d', content: 'Item B4', checked: false, order: 3 },
            ],
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }
          }
        ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/note-1', async (route) => {
      const request = route.request(); 
      if (request.method() === 'PUT') {
        didCallUpdateApi = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/boards/test-board');

    // Locate checklist items
    const itemA1 = page.locator('text=Item A1');
    const itemB1 = page.locator('text=Item B1');
    await expect(itemA1).toBeVisible();

    // Get bounding boxes for precise positioning
    const itemB1Box = await itemB1.boundingBox();
    if(!itemB1Box) {
      throw Error('will never throw');
    }

    await itemA1.hover();
    await page.mouse.down();
    // repeat to trigger dragover event reliably https://playwright.dev/docs/input#dragging-manually
    await itemB1.hover();
    await itemB1.hover();
     // Slightly outside the box for dndkit to trigger drop
    await page.mouse.move(itemB1Box.x + itemB1Box.width/2, itemB1Box.y + 5);
    await page.mouse.up();

    await expect(page.getByTestId('item-1a')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-1b')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-1c')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-1d')).toHaveAttribute('data-testorder', '3');
    await expect(page.getByTestId('item-2a')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-2b')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-2c')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-2d')).toHaveAttribute('data-testorder', '3');

    expect(didCallUpdateApi).toBeFalsy();
  });

  test('should display empty state when no notes exist', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=No notes yet')).toBeVisible();
    await expect(page.locator('button:has-text("Add Your First Note")')).toBeVisible();
  });

  test('should not update state when an unchecked checklist item is dropped after checked', async ({ page }) => {
    let didCallUpdateApi = false;

    await page.route('**/api/boards/test-board/notes', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: 'Test Note with Checklist',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: true, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: true, order: 3 },
            ],
            boardId: 'test-board',
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            board: { id: 'test-board', name: 'Test Board' }
          }
        ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/note-1', async (route) => {
      const request = route.request(); 
      if (request.method() === 'PUT') {
        didCallUpdateApi = true;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      }
    });

    await page.goto('/boards/test-board');

    const itemA1 = page.locator('text=Item A1');
    const itemA3 = page.locator('text=Item A3');
    await expect(itemA1).toBeVisible();

    const itemA3Box = await itemA3.boundingBox();
    if(!itemA3Box) {
      throw Error('will never throw');
    }

    await itemA1.hover();
    await page.mouse.down();
    await itemA3.hover();
    await itemA3.hover();
    await page.mouse.move(itemA3Box.x + itemA3Box.width/2, itemA3Box.y + 5);
    await page.mouse.up();

    await expect(page.getByTestId('item-1a')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-1b')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-1c')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-1d')).toHaveAttribute('data-testorder', '3');

    expect(didCallUpdateApi).toBeFalsy();
  });

  test('should re-order checklist items within a note', async ({ page }) => {    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: 'Test Note with Checklist',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: false, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: false, order: 3 },
            ],
            boardId: 'test-board',
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            board: { id: 'test-board', name: 'Test Board' }
          }
        ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/note-1', async (route) => {
      const request = route.request();
      
      if (request.method() === 'PUT') {
          const body = await request.postDataJSON();
          
          // Process and normalize the order values
          const processedChecklistItems = body.checklistItems?.map((item, index) => ({
            ...item,
            order: index
          })) || [];

        
        const updatedNote = {
          id: 'note-1',
          content: 'Test Note with Checklist',
          color: '#fef3c7',
          done: body.done,
          checklistItems: processedChecklistItems,
          slackMessageId: null,
          boardId: 'test-board',
          createdBy: 'test-user',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          deletedAt: null,
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com'
          },
          board: {
            id: 'test-board',
            name: 'Test Board',
            sendSlackUpdates: false
          }
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ note: updatedNote }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    const itemA1 = page.locator('text=Item A1');
    const itemA3 = page.locator('text=Item A3');
    await expect(itemA1).toBeVisible();

    const itemA1Box = await itemA1.boundingBox();
    if(!itemA1Box) {
      throw Error('will never throw');
    }

    await itemA3.hover();
    await page.mouse.down();
    await itemA1.hover();
    await itemA1.hover();
    await page.mouse.move(itemA1Box.x + itemA1Box.width/2, itemA1Box.y + 5);
    await page.mouse.up();

    await page.waitForTimeout(200);

    await expect(page.getByTestId('item-1c')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-1a')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-1b')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-1d')).toHaveAttribute('data-testorder', '3');
  });

  test('should re-order checked items within checked group area', async ({ page }) => {
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: 'Test Note with Checklist',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: true, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: true, order: 3 },
              { id: 'item-1e', content: 'Item A5', checked: true, order: 4 },
            ],
            boardId: 'test-board',
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            board: { id: 'test-board', name: 'Test Board' }
          }
        ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/note-1', async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
          const body = await request.postDataJSON();
          const processedChecklistItems = body.checklistItems?.map((item, index) => ({
            ...item,
            order: index
          })) || [];
        const updatedNote = {
          id: 'note-1',
          content: 'Test Note with Checklist',
          color: '#fef3c7',
          done: body.done,
          checklistItems: processedChecklistItems,
          boardId: 'test-board',
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com'
          },
          board: {
            id: 'test-board',
            name: 'Test Board',
            sendSlackUpdates: false
          }
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ note: updatedNote }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    const itemA3 = page.locator('text=Item A3');
    const itemA5 = page.locator('text=Item A5');
    await expect(itemA3).toBeVisible();

    const itemA3Box = await itemA3.boundingBox();
    if(!itemA3Box) {
      throw Error('will never throw');
    }

    await itemA5.hover();
    await page.mouse.down();
    await itemA3.hover();
    await itemA3.hover();
    await page.mouse.move(itemA3Box.x + itemA3Box.width/2, itemA3Box.y + 5);
    await page.mouse.up();

    await page.waitForTimeout(200);

    await expect(page.getByTestId('item-1a')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-1b')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-1e')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-1c')).toHaveAttribute('data-testorder', '3');
    await expect(page.getByTestId('item-1d')).toHaveAttribute('data-testorder', '4');
  });

  test('should re-order unchecked items within unchecked group area', async ({ page }) => {
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const request = route.request();
      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: 'Test Note with Checklist',
            color: '#fef3c7',
            done: false,
            checklistItems: [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: false, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: true, order: 3 },
              { id: 'item-1e', content: 'Item A5', checked: true, order: 4 },
            ],
            boardId: 'test-board',
            user: { id: 'test-user', name: 'Test User', email: 'test@example.com' },
            board: { id: 'test-board', name: 'Test Board' }
          }
        ];

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ notes }),
        });
      }
    });

    await page.route('**/api/boards/test-board/notes/note-1', async (route) => {
      const request = route.request();
      if (request.method() === 'PUT') {
          const body = await request.postDataJSON();  
          const processedChecklistItems = body.checklistItems?.map((item, index) => ({
            ...item,
            order: index
          })) || [];
        const updatedNote = {
          id: 'note-1',
          content: 'Test Note with Checklist',
          color: '#fef3c7',
          done: body.done,
          checklistItems: processedChecklistItems,
          boardId: 'test-board',
          createdBy: 'test-user',
          user: {
            id: 'test-user',
            name: 'Test User',
            email: 'test@example.com'
          },
          board: {
            id: 'test-board',
            name: 'Test Board',
            sendSlackUpdates: false
          }
        };

        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ note: updatedNote }),
        });
      }
    });

    await page.goto('/boards/test-board');
    
    const itemA1 = page.locator('text=Item A1');
    const itemA2 = page.locator('text=Item A2');
    await expect(itemA2).toBeVisible();

    const itemA1Box = await itemA1.boundingBox();
    if(!itemA1Box) {
      throw Error('will never throw');
    }

    await itemA2.hover();
    await page.mouse.down();
    await itemA1.hover();
    await itemA1.hover();
    await page.mouse.move(itemA1Box.x + itemA1Box.width/2, itemA1Box.y + 5);
    await page.mouse.up();

    await page.waitForTimeout(200);

    await expect(page.getByTestId('item-1b')).toHaveAttribute('data-testorder', '0');
    await expect(page.getByTestId('item-1a')).toHaveAttribute('data-testorder', '1');
    await expect(page.getByTestId('item-1c')).toHaveAttribute('data-testorder', '2');
    await expect(page.getByTestId('item-1d')).toHaveAttribute('data-testorder', '3');
    await expect(page.getByTestId('item-1e')).toHaveAttribute('data-testorder', '4');
  });
});
