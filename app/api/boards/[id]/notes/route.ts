import { NextRequest, NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"
import { auth } from "@/auth"

const prisma = new PrismaClient()

// Get all notes for a board
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boardId = params.id

    // Verify user has access to this board (same organization)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: { 
        notes: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    return NextResponse.json({ notes: board.notes })
  } catch (error) {
    console.error("Error fetching notes:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// Create a new note
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { content, color, x, y } = await request.json()
    const boardId = params.id

    // Verify user has access to this board (same organization)
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 403 })
    }

    const board = await prisma.board.findUnique({
      where: { id: boardId }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (board.organizationId !== user.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Random colors for sticky notes
    const colors = [
      "#fef3c7", // yellow
      "#fce7f3", // pink
      "#dbeafe", // blue
      "#dcfce7", // green
      "#fed7d7", // red
      "#e0e7ff", // indigo
      "#f3e8ff", // purple
      "#fef4e6", // orange
    ]

    const randomColor = color || colors[Math.floor(Math.random() * colors.length)]

    const note = await prisma.note.create({
      data: {
        content,
        color: randomColor,
        x: x || 0,
        y: y || 0,
        boardId,
        createdBy: session.user.id,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true
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