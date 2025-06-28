import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

// Update a note
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, x, y } = await request.json()
    const { id: boardId, noteId } = params

    // Verify user has access to this board (same organization)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { board: true }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const updatedNote = await prisma.note.update({
      where: { id: noteId },
      data: {
        ...(content !== undefined && { content }),
        ...(color !== undefined && { color }),
        ...(x !== undefined && { x }),
        ...(y !== undefined && { y }),
      },
    })

    return NextResponse.json({ note: updatedNote })
  } catch (error) {
    console.error("Error updating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Delete a note
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; noteId: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id: boardId, noteId } = params

    // Verify user has access to this board (same organization)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    // Verify the note belongs to a board in the user's organization
    const note = await prisma.note.findUnique({
      where: { id: noteId },
      include: { board: true }
    })

    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 })
    }

    if (note.board.organizationId !== user.organizationId || note.boardId !== boardId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    await prisma.note.delete({
      where: { id: noteId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 