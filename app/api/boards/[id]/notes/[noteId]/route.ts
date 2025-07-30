import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { updateSlackMessage, formatNoteForSlack, sendSlackMessage, formatChecklistItemForSlack, updateChecklistItemSlackMessage } from "@/lib/slack"

// Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, done, isChecklist, checklistItems } = await request.json()
    const { id: boardId, noteId } = await params

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organization: {
          select: {
            id: true,
            name: true,
            slackWebhookUrl: true
          }
        }
      }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { 
        board: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check if note is soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user is the author of the note or an admin
    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Only the note author or admin can edit this note" }, { status: 403 })
    }

    const updatedNote = await db.note.update({
      where: { id: noteId },
      data: {
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        ...(done !== undefined && { done }),
        ...(isChecklist !== undefined && { isChecklist }),
        ...(checklistItems !== undefined && { checklistItems }),
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        board: {
          select: {
            name: true
          }
        }
      }
    })

    // Send Slack notification if content is being added to a previously empty note
    if (content !== undefined && user.organization?.slackWebhookUrl && !note.slackMessageId) {
      const wasEmpty = !note.content || note.content.trim() === ''
      const hasContent = content && content.trim() !== ''
      
      if (wasEmpty && hasContent) {
        const slackMessage = formatNoteForSlack(updatedNote, updatedNote.board.name, user.name || user.email || 'Unknown User')
        const messageId = await sendSlackMessage(user.organization.slackWebhookUrl, {
          text: slackMessage,
          username: 'Gumboard',
          icon_emoji: ':clipboard:'
        })

        if (messageId) {
          await db.note.update({
            where: { id: noteId },
            data: { slackMessageId: messageId }
          })
        }
      }
    }

    if (checklistItems !== undefined && user.organization?.slackWebhookUrl) {
      const oldItems = note.checklistItems || []
      const newItems = checklistItems || []
      
      const addedItems = newItems.filter(newItem => 
        !oldItems.some(oldItem => oldItem.id === newItem.id)
      )
      
      // Send Slack notifications for new checklist items
      for (const item of addedItems) {
        if (item.content?.trim()) {
          const slackMessage = formatChecklistItemForSlack(
            item, 
            updatedNote.content || 'Untitled Note',
            updatedNote.board.name, 
            user.name || user.email || 'Unknown User'
          )
          const messageId = await sendSlackMessage(user.organization.slackWebhookUrl, {
            text: slackMessage,
            username: 'Gumboard',
            icon_emoji: ':white_check_mark:'
          })
          
          if (messageId) {
            // Update the item with the Slack message ID
            const itemIndex = newItems.findIndex(i => i.id === item.id)
            if (itemIndex !== -1) {
              newItems[itemIndex].slackMessageId = messageId
            }
          }
        }
      }
      
      for (const newItem of newItems) {
        const oldItem = oldItems.find(old => old.id === newItem.id)
        if (oldItem && oldItem.checked !== newItem.checked && newItem.slackMessageId) {
          const originalMessage = formatChecklistItemForSlack(
            newItem,
            updatedNote.content || 'Untitled Note',
            updatedNote.board.name,
            user.name || user.email || 'Unknown User'
          )
          await updateChecklistItemSlackMessage(
            user.organization.slackWebhookUrl,
            originalMessage,
            newItem.checked
          )
        }
      }
      
      // Update the note with the modified checklist items (including Slack message IDs)
      if (addedItems.length > 0) {
        const finalUpdatedNote = await db.note.update({
          where: { id: noteId },
          data: { checklistItems: newItems },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            board: {
              select: {
                name: true
              }
            }
          }
        })
        
        return NextResponse.json({ note: finalUpdatedNote })
      }
    }

    // Update existing Slack message when done status changes
    if (done !== undefined && user.organization?.slackWebhookUrl && note.slackMessageId) {
      const originalMessage = formatNoteForSlack(note, note.board.name, note.user?.name || note.user?.email || 'Unknown User')
      await updateSlackMessage(user.organization.slackWebhookUrl, originalMessage, done)
    }

    return NextResponse.json({ note: updatedNote })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete a note (soft delete)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; noteId: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: boardId, noteId } = await params

    // Verify user has access to this board (same organization)
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await db.note.findUnique({
      where: { id: noteId },
      include: { board: true }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    // Check if note is already soft-deleted
    if (note.deletedAt) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user is the author of the note or an admin
    if (note.createdBy !== session.user.id && !user.isAdmin) {
      return NextResponse.json({ error: "Only the note author or admin can delete this note" }, { status: 403 })
    }

    // Soft delete: set deletedAt timestamp instead of actually deleting
    await db.note.update({
      where: { id: noteId },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}        