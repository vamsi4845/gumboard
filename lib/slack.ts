interface SlackMessage {
  text: string
  username?: string
  icon_emoji?: string
}

interface SlackApiMessage {
  channel: string
  text: string
  username?: string
  icon_emoji?: string
}

interface SlackApiResponse {
  ok: boolean
  ts?: string
  error?: string
  channel?: string
}

export async function sendSlackApiMessage(token: string, message: SlackApiMessage): Promise<string | null> {
  try {
    const response = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    const data: SlackApiResponse = await response.json()
    
    if (!data.ok) {
      console.error('Slack API error:', data.error)
      return null
    }

    return data.ts || null
  } catch (error) {
    console.error('Error sending Slack API message:', error)
    return null
  }
}

export async function updateSlackApiMessage(token: string, channel: string, timestamp: string, message: Partial<SlackApiMessage>): Promise<boolean> {
  try {
    console.log('Updating Slack message:', { channel, timestamp, text: message.text?.substring(0, 50) + '...' });
    
    const response = await fetch('https://slack.com/api/chat.update', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel,
        ts: timestamp,
        ...message,
      }),
    })

    const data: SlackApiResponse = await response.json()
    
    console.log('Slack update response:', { ok: data.ok, error: data.error });
    
    if (!data.ok) {
      console.error('Slack API update error:', data.error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error updating Slack API message:', error)
    return false
  }
}

export function hasValidContent(content: string | null | undefined): boolean {
  if (!content) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (null/undefined)`)
    return false
  }
  
  const trimmed = content.trim()
  
  if (trimmed.length === 0) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (empty after trim)`)
    return false
  }
  
  const hasSubstantiveContent = /[a-zA-Z0-9\u00C0-\u017F\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff]/.test(trimmed)
  
  if (!hasSubstantiveContent) {
    console.log(`[Slack] hasValidContent check: "${content}" -> false (no substantive content)`)
    return false
  }
  
  console.log(`[Slack] hasValidContent check: "${content}" -> true`)
  return true
}

const notificationDebounce = new Map<string, number>()
const DEBOUNCE_DURATION = 1000

export function clearNotificationDebounce() {
  notificationDebounce.clear()
}

export function shouldSendNotification(userId: string, boardId: string, boardName: string, sendSlackUpdates: boolean = true): boolean {
  if (boardName.startsWith("Test")) {
    console.log(`[Slack] Skipping notification for test board: ${boardName}`)
    return false
  }
  
  if (!sendSlackUpdates) {
    console.log(`[Slack] Skipping notification for board with disabled Slack updates: ${boardName}`)
    return false
  }
  
  const key = `${userId}-${boardId}`
  const now = Date.now()
  const lastNotification = notificationDebounce.get(key)
  
  if (lastNotification && now - lastNotification < DEBOUNCE_DURATION) {
    console.log(`[Slack] Debounced notification for ${key} (${now - lastNotification}ms ago)`)
    return false
  }
  
  notificationDebounce.set(key, now)
  console.log(`[Slack] Allowing notification for ${key}`)
  return true
}

export async function sendSlackMessage(webhookUrl: string, message: SlackMessage, options?: { token?: string; channel?: string }): Promise<string | null> {
  // If we have API token and channel, use API (supports editing)
  if (options?.token && options?.channel) {
    return await sendSlackApiMessage(options.token, {
      channel: options.channel,
      ...message,
    })
  }

  // Fallback to webhook (legacy mode)
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    })

    if (!response.ok) {
      console.error('Failed to send Slack message:', response.statusText)
      return null
    }

    // Webhooks don't return message timestamps, so we generate a fake one for consistency
    return `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  } catch (error) {
    console.error('Error sending Slack message:', error)
    return null
  }
}

export async function updateSlackMessage(webhookUrl: string, originalText: string, completed: boolean, boardName: string, userName: string): Promise<void> {
  try {
    const updatedText = completed 
      ? `:white_check_mark: ${originalText} by ${userName} in ${boardName}`
      : `:heavy_plus_sign: ${originalText} by ${userName} in ${boardName}`
    
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: updatedText,
        username: 'Gumboard',
        icon_emoji: ':clipboard:'
      }),
    })
  } catch (error) {
    console.error('Error updating Slack message:', error)
  }
}

export function formatNoteForSlack(note: { content: string }, boardName: string, userName: string): string {
  return `:heavy_plus_sign: ${note.content} by ${userName} in ${boardName}`
}

export function formatTodoForSlack(todoContent: string, boardName: string, userName: string, action: 'added' | 'completed' | 'reopened'): string {
  if (action === 'completed') {
    return `:white_check_mark: ~~${todoContent}~~ by ${userName} in ${boardName}`
  } else if (action === 'reopened') {
    return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
  }
  return `:heavy_plus_sign: ${todoContent} by ${userName} in ${boardName}`
}

export async function sendTodoNotification(webhookUrl: string, todoContent: string, boardName: string, userName: string, action: 'added' | 'completed' | 'reopened', options?: { token?: string; channel?: string }): Promise<string | null> {
  const message = formatTodoForSlack(todoContent, boardName, userName, action)
  return await sendSlackMessage(webhookUrl, {
    text: message,
    username: 'Gumboard',
    icon_emoji: ':clipboard:'
  }, options)
}

/**
 * Updates an existing Slack message for a checklist item
 */
export async function updateSlackTodoMessage(
  webhookUrl: string, 
  messageId: string, 
  todoContent: string, 
  boardName: string, 
  userName: string, 
  action: 'completed' | 'reopened',
  options?: { token?: string; channel?: string }
): Promise<boolean> {
  const message = formatTodoForSlack(todoContent, boardName, userName, action)
  
  // If we have API credentials and this is a real message ID, update it
  if (options?.token && options?.channel && !messageId.startsWith('webhook_')) {
    return await updateSlackApiMessage(options.token, options.channel, messageId, {
      text: message,
      username: 'Gumboard',
      icon_emoji: ':clipboard:'
    })
  }

  // For webhook messages or when API is not available, we can't edit - log it
  console.log('Cannot update webhook message - would send new message:', { messageId, message })
  return false
}

export async function notifySlackForNoteChanges(params: {
  webhookUrl?: string,
  boardName: string,
  boardId: string,
  sendSlackUpdates: boolean,
  userId: string,
  userName: string,
  prevContent: string,
  nextContent: string,
  noteSlackMessageId?: string | null,
  itemChanges?: {
    created: Array<{id: string, content: string, checked: boolean, order: number}>,
    updated: Array<{id: string, content: string, checked: boolean, order: number, previous: {content: string, checked: boolean, order: number}}>,
    deleted: Array<{id: string, content: string, checked: boolean, order: number}>
  },
  // New Slack API options for message editing
  slackApiToken?: string,
  slackChannelId?: string,
  existingMessageIds?: Record<string, string> // itemId -> messageId mapping
}): Promise<{noteMessageId?: string | null; itemMessageIds?: Record<string, string>}> {
  const { 
    webhookUrl, boardName, boardId, sendSlackUpdates, userId, userName, 
    prevContent, nextContent, noteSlackMessageId, itemChanges,
    slackApiToken, slackChannelId, existingMessageIds 
  } = params;
  
  const out: {noteMessageId?: string | null; itemMessageIds?: Record<string, string>} = {};
  
  if ((!webhookUrl && (!slackApiToken || !slackChannelId)) || !sendSlackUpdates) return out;

  const slackOptions = slackApiToken && slackChannelId ? { token: slackApiToken, channel: slackChannelId } : undefined;
  const useWebhook = !slackOptions && webhookUrl;

  console.log('Slack notification params:', {
    hasSlackOptions: !!slackOptions,
    useWebhook,
    hasWebhookUrl: !!webhookUrl,
    slackApiToken: slackApiToken ? 'present' : 'missing',
    slackChannelId: slackChannelId ? 'present' : 'missing',
    existingMessageIdsCount: Object.keys(existingMessageIds || {}).length
  });

  // empty to non-empty note
  const had = hasValidContent(prevContent);
  const has = hasValidContent(nextContent);
  if (!noteSlackMessageId && !had && has && shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) {
    if (useWebhook) {
      out.noteMessageId = await sendSlackMessage(webhookUrl!, {
        text: formatNoteForSlack({ content: nextContent as string }, boardName, userName),
        username: 'Gumboard', 
        icon_emoji: ':clipboard:'
      });
    } else if (slackOptions) {
      out.noteMessageId = await sendSlackApiMessage(slackOptions.token, {
        channel: slackOptions.channel,
        text: formatNoteForSlack({ content: nextContent as string }, boardName, userName)
      });
    }
  }

  const ids: Record<string, string> = {};
  const created = itemChanges?.created ?? [];
  const updated = itemChanges?.updated ?? [];

  // Handle created items - only send notifications for new items
  for (const item of created) {
    if (hasValidContent(item.content) && shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) {
      let msgId: string | null = null;
      if (useWebhook) {
        msgId = await sendTodoNotification(webhookUrl!, item.content, boardName, userName, 'added');
      } else if (slackOptions) {
        msgId = await sendSlackApiMessage(slackOptions.token, {
          channel: slackOptions.channel,
          text: formatTodoForSlack(item.content, boardName, userName, 'added')
        });
      }
      if (msgId) ids[item.id] = msgId;
    }
  }

  // Handle updated items - try to update existing messages when possible
  for (const u of updated) {
    const toggled = !!u.previous && u.previous.checked !== u.checked;
    if (!toggled || !hasValidContent(u.content)) continue;
    if (!shouldSendNotification(userId, boardId, boardName, sendSlackUpdates)) continue;
    
    const action = u.checked ? 'completed' : 'reopened';
    const existingMessageId = existingMessageIds?.[u.id];
    
    // Try to update existing message if we have the ID and API access
    if (existingMessageId && slackOptions) {
      console.log(`Attempting to update existing message ${existingMessageId} for item ${u.id}`);
      const updated = await updateSlackApiMessage(
        slackOptions.token, slackOptions.channel, existingMessageId, {
          text: formatTodoForSlack(u.content, boardName, userName, action)
        }
      );
      
      console.log(`Message update result for ${u.id}:`, updated);
      
      if (updated) {
        // Keep the same message ID since we updated it
        ids[u.id] = existingMessageId;
        continue;
      }
    }
    
    // Fall back to creating a new message
    let msgId: string | null = null;
    if (useWebhook) {
      msgId = await sendTodoNotification(webhookUrl!, u.content, boardName, userName, action);
    } else if (slackOptions) {
      msgId = await sendSlackApiMessage(slackOptions.token, {
        channel: slackOptions.channel,
        text: formatTodoForSlack(u.content, boardName, userName, action)
      });
    }
    if (msgId) ids[u.id] = msgId;
  }

  if (Object.keys(ids).length) out.itemMessageIds = ids;
  return out;
}
