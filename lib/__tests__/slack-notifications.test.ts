import { notifySlackForNoteChanges, clearNotificationDebounce } from '@/lib/slack';

global.fetch = jest.fn();

describe('Slack Notifications', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    mockFetch.mockClear();
    mockFetch.mockResolvedValue({
      ok: true,
      status: 200,
    } as Response);
    
    // Clear debounce map between tests
    clearNotificationDebounce();
  });

  describe('notifySlackForNoteChanges', () => {
    const baseParams = {
      webhookUrl: 'https://hooks.slack.com/webhook',
      boardName: 'Project Board',
      boardId: 'board-123',
      sendSlackUpdates: true,
      userId: 'user-123',
      userName: 'Test User',
      prevContent: '',
      nextContent: '',
    };

    it('should post exactly one message for first created item only', async () => {
      const itemChanges = {
        created: [
          { id: 'item-1', content: 'First item', checked: false, order: 0 },
          { id: 'item-2', content: 'Second item', checked: false, order: 1 },
          { id: 'item-3', content: 'Third item', checked: false, order: 2 },
        ],
        updated: [],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      // Should only call fetch once for the first created item
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/webhook',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('First item'),
        })
      );

      // Should return message ID for only the first item
      expect(result.itemMessageIds).toEqual({ 'item-1': expect.any(String) });
    });

    it('should post nothing for text-only changes', async () => {
      const itemChanges = {
        created: [],
        updated: [
          {
            id: 'item-1',
            content: 'Updated content',
            checked: false,
            order: 0,
            previous: { content: 'Original content', checked: false, order: 0 }
          },
        ],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      // Should not call fetch for text-only changes
      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it('should post for checked: false → true (completed)', async () => {
      const itemChanges = {
        created: [],
        updated: [
          {
            id: 'item-1',
            content: 'Test item',
            checked: true,
            order: 0,
            previous: { content: 'Test item', checked: false, order: 0 }
          },
        ],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/webhook',
        expect.objectContaining({
          body: expect.stringContaining('white_check_mark'),
        })
      );

      expect(result.itemMessageIds).toEqual({ 'item-1': expect.any(String) });
    });

    it('should post for checked: true → false (reopened)', async () => {
      const itemChanges = {
        created: [],
        updated: [
          {
            id: 'item-1',
            content: 'Test item',
            checked: false,
            order: 0,
            previous: { content: 'Test item', checked: true, order: 0 }
          },
        ],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/webhook',
        expect.objectContaining({
          body: expect.stringContaining('heavy_plus_sign'),
        })
      );

      expect(result.itemMessageIds).toEqual({ 'item-1': expect.any(String) });
    });

    it('should post nothing when sendSlackUpdates is false', async () => {
      const itemChanges = {
        created: [
          { id: 'item-1', content: 'Test item', checked: false, order: 0 },
        ],
        updated: [],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        sendSlackUpdates: false,
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it('should post nothing when webhookUrl is null', async () => {
      const itemChanges = {
        created: [
          { id: 'item-1', content: 'Test item', checked: false, order: 0 },
        ],
        updated: [],
        deleted: []
      };

      const result = await notifySlackForNoteChanges({
        ...baseParams,
        webhookUrl: '',
        itemChanges,
      });

      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.itemMessageIds).toBeUndefined();
    });

    it('should post exactly one message for note empty→non-empty transition', async () => {
      const result = await notifySlackForNoteChanges({
        ...baseParams,
        prevContent: '',
        nextContent: 'New content',
        noteSlackMessageId: null,
      });

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/webhook',
        expect.objectContaining({
          body: expect.stringContaining('New content'),
        })
      );

      expect(result.noteMessageId).toBeDefined();
    });

    it('should not post when note already has slackMessageId', async () => {
      const result = await notifySlackForNoteChanges({
        ...baseParams,
        prevContent: '',
        nextContent: 'New content',
        noteSlackMessageId: 'existing-message-id',
      });

      expect(mockFetch).toHaveBeenCalledTimes(0);
      expect(result.noteMessageId).toBeUndefined();
    });
  });
});
