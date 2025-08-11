import { test, expect } from '@playwright/test'

test.describe('Polling Functionality', () => {
  let requestCount = 0;
  let etagValue = 'initial-etag';
  let notesData = [
    {
      id: 'note-1',
      content: 'Test note 1',
      color: '#fef3c7',
      done: false,
      checklistItems: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: 'test-user',
        name: 'Test User',
        email: 'test@example.com',
      },
    }
  ];

  test.beforeEach(async ({ page }) => {
    requestCount = 0;
    etagValue = 'initial-etag';
    
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
  });

  test('should poll for notes at regular intervals', async ({ page }) => {
    const pollingRequests: number[] = [];
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const timestamp = Date.now();
      pollingRequests.push(timestamp);
      requestCount++;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': etagValue,
        },
        body: JSON.stringify({ notes: notesData }),
      });
    });

    await page.goto('/boards/test-board');
    
    await page.waitForTimeout(13000);
    
    expect(requestCount).toBeGreaterThanOrEqual(4);
    
    for (let i = 1; i < pollingRequests.length; i++) {
      const interval = pollingRequests[i] - pollingRequests[i - 1];
      if (i === 1) continue;
      expect(interval).toBeGreaterThan(3500);
      expect(interval).toBeLessThan(4500);
    }
  });

  test('should use ETag caching and return 304 when data unchanged', async ({ page }) => {
    let returned304 = false;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const ifNoneMatch = route.request().headers()['if-none-match'];
      
      if (ifNoneMatch === etagValue && requestCount > 0) {
        returned304 = true;
        await route.fulfill({
          status: 304,
          headers: {
            'ETag': etagValue,
          },
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: {
            'ETag': etagValue,
          },
          body: JSON.stringify({ notes: notesData }),
        });
      }
      requestCount++;
    });

    await page.goto('/boards/test-board');
    
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Wait for a polling cycle
    await page.waitForTimeout(5000);
    
    // Should have returned 304 for unchanged data
    expect(returned304).toBe(true);
  });

  test('should pause polling when tab is hidden and resume when visible', async ({ page }) => {
    let lastRequestTime = 0;
    let pausedDuringHidden = true;
    let localRequestCount = 0;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const currentTime = Date.now();
      
      if (lastRequestTime > 0) {
        const timeSinceLastRequest = currentTime - lastRequestTime;
        if (timeSinceLastRequest < 4000 && localRequestCount === 2) {
          pausedDuringHidden = false;
        }
      }
      
      lastRequestTime = currentTime;
      localRequestCount++;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': `etag-${localRequestCount}`,
        },
        body: JSON.stringify({ notes: notesData }),
      });
    });

    await page.goto('/boards/test-board');
    
    await page.waitForTimeout(1000);
    expect(localRequestCount).toBeGreaterThanOrEqual(1);
    
    const countBeforeHide = localRequestCount;
    
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(5000);
    
    expect(localRequestCount).toBe(countBeforeHide);
    expect(pausedDuringHidden).toBe(true);
    
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    
    await page.waitForTimeout(500);
    expect(localRequestCount).toBeGreaterThan(countBeforeHide);
  });

  test('should slow down polling after inactivity', async ({ page }) => {
    const pollingTimes: number[] = [];
    let mockTime = Date.now();
    
    await page.addInitScript(() => {
      const originalDateNow = Date.now;
      let currentMockTime = Date.now();
      
      Date.now = () => currentMockTime;
      
      window.setMockTime = (time) => {
        currentMockTime = time;
      };
      
      window.advanceMockTime = (ms) => {
        currentMockTime += ms;
      };
    });
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const currentTime = await page.evaluate(() => Date.now());
      pollingTimes.push(currentTime);
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': `etag-${currentTime}`,
        },
        body: JSON.stringify({ notes: notesData }),
      });
    });

    await page.goto('/boards/test-board');
    
    await page.waitForTimeout(500);
    
    await page.click('body');
    
    await page.waitForTimeout(8000);
    
    const normalIntervals: number[] = [];
    for (let i = 2; i < Math.min(4, pollingTimes.length); i++) {
      normalIntervals.push(pollingTimes[i] - pollingTimes[i - 1]);
    }
    
    await page.evaluate(() => {
      window.advanceMockTime(35000);
    });
    
    await page.waitForTimeout(10000);
    
    const slowIntervals: number[] = [];
    const recentRequests = pollingTimes.slice(-3);
    for (let i = 1; i < recentRequests.length; i++) {
      slowIntervals.push(recentRequests[i] - recentRequests[i - 1]);
    }
    
    const avgNormalInterval = normalIntervals.reduce((a, b) => a + b, 0) / normalIntervals.length;
    const avgSlowInterval = slowIntervals.reduce((a, b) => a + b, 0) / slowIntervals.length;
    
    expect(avgSlowInterval).toBeGreaterThan(avgNormalInterval * 1.5);
  });

  test.skip('should only trigger updates when data changes', async ({ page }) => {
    let responseCount = 0;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      responseCount++;
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': 'same-etag',
        },
        body: JSON.stringify({ notes: notesData }),
      });
    });

    await page.goto('/boards/test-board');
    
    await page.waitForSelector('.note-background');
    
    await page.waitForTimeout(10000);
    
    expect(responseCount).toBeGreaterThan(1);
  });

  test('should clean up polling on unmount', async ({ page }) => {
    let requestsAfterNavigation = 0;
    let navigationTime = 0;
    
    await page.route('**/api/boards/test-board/notes', async (route) => {
      const currentTime = Date.now();
      
      if (navigationTime > 0 && currentTime > navigationTime) {
        requestsAfterNavigation++;
      }
      
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'ETag': 'test-etag',
        },
        body: JSON.stringify({ notes: notesData }),
      });
    });

    await page.goto('/boards/test-board');
    
    // Wait for initial load and one polling cycle
    await page.waitForTimeout(5000);
    
    // Navigate away from the page
    navigationTime = Date.now();
    await page.goto('/dashboard');
    
    // Wait for what would be multiple polling cycles
    await page.waitForTimeout(10000);
    
    // Should not have made any requests after navigation
    expect(requestsAfterNavigation).toBe(0);
  });
});