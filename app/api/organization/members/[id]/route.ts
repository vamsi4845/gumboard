import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const memberId = (await params).id

    // Get current user with organization
    const currentUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Get the member to be removed
    const memberToRemove = await db.user.findUnique({
      where: { id: memberId }
    })

    if (!memberToRemove) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 })
    }

    // Verify the member belongs to the same organization
    if (memberToRemove.organizationId !== currentUser.organizationId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Prevent users from removing themselves
    if (memberId === session.user.id) {
      return NextResponse.json({ error: "You cannot remove yourself from the organization" }, { status: 400 })
    }

    // Remove the member from the organization
    await db.user.update({
      where: { id: memberId },
      data: { organizationId: null }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error removing member:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 