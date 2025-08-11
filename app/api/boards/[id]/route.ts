import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    const boardId = (await params).id

    const board = await db.board.findUnique({
      where: { id: boardId },
      select: { 
        id: true,
        name: true,
        description: true,
        isPublic: true,
        sendSlackUpdates: true,
        organizationId: true,
        createdBy: true,
        createdAt: true,
        updatedAt: true,
        organization: { 
          select: { 
            id: true, 
            name: true 
          } 
        } 
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    if (board.isPublic) {
      const { organization, ...boardData } = board
      const res = NextResponse.json({ 
        board: {
          ...boardData,
          organization: {
            id: organization.id,
            name: organization.name
          }
        }
      })
      res.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=120')
      return res
    }

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is member of the organization
    const userOrg = await db.user.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });
    const isMember = userOrg?.organizationId === board.organizationId
    
    if (!isMember) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Return board data without sensitive organization member details
    const { organization, ...boardData } = board
    
    const res = NextResponse.json({ 
      board: {
        ...boardData,
        organization: {
          id: organization.id,
          name: organization.name
        }
      }
    })
    res.headers.set('Cache-Control', 'private, max-age=30, stale-while-revalidate=60')
    return res
  } catch (error) {
    console.error("Error fetching board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export const runtime = "nodejs"

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boardId = (await params).id
    const { name, description, sendSlackUpdates } = await request.json()

    // Check if board exists and user has access
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { 
        organization: { 
          include: { 
            members: {
              select: {
                id: true,
                isAdmin: true
              }
            }
          } 
        } 
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check if user is member of the organization
    const currentUser = board.organization.members.find(member => member.id === session?.user?.id)
    
    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // For name/description updates, check if user can edit this board (board creator or admin)
    if ((name !== undefined || description !== undefined) && 
        board.createdBy !== session.user.id && !currentUser.isAdmin) {
      return NextResponse.json({ error: "Only the board creator or admin can edit this board" }, { status: 403 })
    }

    const updateData: {
      name?: string;
      description?: string;
      sendSlackUpdates?: boolean;
    } = {}
    if (name !== undefined) updateData.name = name?.trim() || board.name
    if (description !== undefined) updateData.description = description?.trim() || board.description
    if (sendSlackUpdates !== undefined) updateData.sendSlackUpdates = sendSlackUpdates

    const updatedBoard = await db.board.update({
      where: { id: boardId },
      data: updateData,
      include: {
        _count: {
          select: { notes: true }
        },
        organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json({ board: updatedBoard })
  } catch (error) {
    console.error("Error updating board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
export const preferredRegion = "auto"
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const boardId = (await params).id

    // Check if board exists and user has access
    const board = await db.board.findUnique({
      where: { id: boardId },
      include: { 
        organization: { 
          include: { 
            members: {
              select: {
                id: true,
                name: true,
                email: true,
                isAdmin: true
              }
            }
          } 
        } 
      }
    })

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 })
    }

    // Check if user is member of the organization
    const currentUser = board.organization.members.find(member => member.id === session?.user?.id)
    
    if (!currentUser) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if user can delete this board (board creator or admin)
    if (board.createdBy !== session.user.id && !currentUser.isAdmin) {
      return NextResponse.json({ error: "Only the board creator or admin can delete this board" }, { status: 403 })
    }

    // Delete the board
    await db.board.delete({
      where: { id: boardId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting board:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}         
export const dynamic = "force-dynamic"