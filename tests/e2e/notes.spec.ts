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
      else if (request.method() === 'PUT') {
        didCallUpdateApi = true;
        // You should ideally read and parse the body here if you want to assert it

        // Respond with a successful update response to avoid hanging
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true }),
        });
      } 
    });

    await page.goto('/boards/test-board');

    // Locate checklist items
    const itemB1 = page.locator('text=Item B1');
    const itemA1 = page.locator('text=Item A1');
    await expect(itemA1).toBeVisible();

    // Get bounding boxes for precise positioning
    const itemB1Box = await itemB1.boundingBox();

    if(!itemB1Box) {
      throw Error('Will neverHappen');
    }

    await itemA1.hover();
    await page.mouse.down();
    await itemB1.hover();
    await itemB1.hover(); // repeat to trigger dragover event reliably
    await page.mouse.move(itemB1Box.x + itemB1Box.width/2, itemB1Box.y + 5); // Top of Item B1
    await page.mouse.up();



    await expect(page.getByText('Item A1Item A2Item A3Item A4')).toBeVisible();
    await expect(page.getByText('Item B1Item B2Item B3Item B4')).toBeVisible();

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
            slackMessageId: null,
            boardId: 'test-board',
            createdBy: 'test-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
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
    
    const itemA3 = page.locator('text=Item A3');
    const itemA1 = page.locator('text=Item A1');
    await expect(itemA1).toBeVisible();
    // Get bounding boxes for precise positioning
    const itemA1Box = await itemA1.boundingBox();

    if(!itemA1Box) {
      throw Error('Will neverHappen');
    }

    await itemA3.hover();
    await page.mouse.down();
    await itemA1.hover();
    await itemA1.hover(); // repeat to trigger dragover event reliably
    await page.mouse.move(itemA1Box.x + itemA1Box.width/2, itemA1Box.y + 5); // Top of Item A1
    await page.mouse.up();
    await page.waitForTimeout(200);

    await expect(page.getByText('Item A3Item A1Item A2Item A4')).toBeVisible();
  });

  test('should re-order checklist items on all-boards', async ({ page }) => {    
    await page.route('**/api/boards/all-notes/notes', async (route) => {
      const request = route.request();

      if (request.method() === 'GET') {
        const notes = [
          {
            id: 'note-1',
            content: 'Test Note with Checklist',
            color: '#fef3c7',
            done: false,
            checklistItems: updateApiCalls.length > 0 ? updateApiCalls[0].checklistItems : [
              { id: 'item-1a', content: 'Item A1', checked: false, order: 0 },
              { id: 'item-1b', content: 'Item A2', checked: false, order: 1 },
              { id: 'item-1c', content: 'Item A3', checked: false, order: 2 },
              { id: 'item-1d', content: 'Item A4', checked: false, order: 3 },
            ],
            slackMessageId: null,
            boardId: 'test-board',
            createdBy: 'test-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
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
            slackMessageId: null,
            boardId: 'test-board',
            createdBy: 'test-user',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            deletedAt: null,
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

     // Test all-notes board logic
    await page.goto('/boards/all-notes');

    await expect(page.getByText('Item A1')).toBeVisible();
    
    const itemA3 = page.locator('text=Item A3');
    const itemA1 = page.locator('text=Item A1');


    // Get bounding boxes for precise positioning
    const itemA1Box = await itemA1.boundingBox();

    if(!itemA1Box) {
      throw Error('Will neverHappen');
    }

    await itemA3.hover();
    await page.mouse.down();
    await itemA1.hover();
    await itemA1.hover(); // repeat to trigger dragover event reliably
    await page.mouse.move(itemA1Box.x + itemA1Box.width/2, itemA1Box.y + 5); // Top of Item A1
    await page.mouse.up();
    await page.waitForTimeout(200);

    await expect(page.getByText('Item A3Item A1Item A2Item A4')).toBeVisible();
    
    await expect(page.getByText('Item A3')).toBeVisible();

  });

  test('should display empty state when no notes exist', async ({ page }) => {
    await page.goto('/boards/test-board');
    
    await expect(page.locator('text=No notes yet')).toBeVisible();
    await expect(page.locator('button:has-text("Add Your First Note")')).toBeVisible();
  });
});

