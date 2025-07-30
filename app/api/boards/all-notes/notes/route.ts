import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NOTE_COLORS } from "@/lib/constants"

// Get all notes from all boards in the organization
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const boardNotes = await db.note.findMany({
      where: {
        deletedAt: null,
        board: {
          organizationId: user.organizationId!
        }
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        board: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    const notes = boardNotes

    return NextResponse.json({ notes })
  } catch (error) {
    console.error("Error fetching global notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, boardId } = await request.json()

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 })
    }

    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organization) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    if (boardId) {
      const board = await db.board.findUnique({
        where: { id: boardId }
      })

      if (!board) {
        return NextResponse.json({ error: "Board not found" }, { status: 404 })
      }

      if (board.organizationId !== user.organizationId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const randomColor = color || NOTE_COLORS[Math.floor(Math.random() * NOTE_COLORS.length)]

    const note = await db.note.create({
      data: {
        content,
        color: randomColor,
        boardId: boardId || null,
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          }
        },
        board: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    })

    return NextResponse.json({ note }, { status: 201 })
  } catch (error) {
    console.error("Error creating note:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
