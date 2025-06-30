import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function PUT(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { name } = await request.json()

    if (!name || typeof name !== 'string') {
      return NextResponse.json({ error: "Organization name is required" }, { status: 400 })
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Update organization name
    await db.organization.update({
      where: { id: user.organizationId },
      data: { name: name.trim() }
    })

    // Return updated user data
    const updatedUser = await db.user.findUnique({
      where: { id: session.user.id },
      include: { 
        organization: {
          include: {
            members: {
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

    return NextResponse.json({
      id: updatedUser!.id,
      name: updatedUser!.name,
      email: updatedUser!.email,
      organization: updatedUser!.organization ? {
        id: updatedUser!.organization.id,
        name: updatedUser!.organization.name,
        members: updatedUser!.organization.members
      } : null
    })
  } catch (error) {
    console.error("Error updating organization:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 