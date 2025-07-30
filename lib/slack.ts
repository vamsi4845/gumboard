interface SlackMessage {
  text: string
  username?: string
  icon_emoji?: string
}

export async function sendSlackMessage(webhookUrl: string, message: SlackMessage): Promise<string | null> {
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

    return Date.now().toString()
  } catch (error) {
    console.error('Error sending Slack message:', error)
    return null
  }
}

export async function updateSlackMessage(webhookUrl: string, originalText: string, completed: boolean): Promise<void> {
  try {
    const updatedText = completed ? `~${originalText}~` : originalText
    
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

export function formatNoteForSlack(note: { content: string; isChecklist?: boolean }, boardName: string, userName: string): string {
  const noteType = note.isChecklist ? 'Todo' : 'Note'
  return `New ${noteType} added to "${boardName}" by ${userName}: ${note.content}`
}
