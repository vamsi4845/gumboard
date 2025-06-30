import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { email } = await request.json()

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const cleanEmail = email.trim().toLowerCase()

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Check if user is already in the organization
    const existingUser = await db.user.findUnique({
      where: { email: cleanEmail }
    })

    if (existingUser && existingUser.organizationId === user.organizationId) {
      return NextResponse.json({ error: "User is already a member of this organization" }, { status: 400 })
    }

    // Check if there's already a pending invite
    const existingInvite = await db.organizationInvite.findUnique({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: user.organizationId
        }
      }
    })

    if (existingInvite && existingInvite.status === 'PENDING') {
      return NextResponse.json({ error: "Invite already sent to this email" }, { status: 400 })
    }

    // Create or update the invite
    const invite = await db.organizationInvite.upsert({
      where: {
        email_organizationId: {
          email: cleanEmail,
          organizationId: user.organizationId
        }
      },
      update: {
        status: 'PENDING',
        createdAt: new Date()
      },
      create: {
        email: cleanEmail,
        organizationId: user.organizationId,
        invitedBy: session.user.id,
        status: 'PENDING'
      }
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    console.error("Error creating invite:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 