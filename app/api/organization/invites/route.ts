import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organization
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true }
    })

    if (!user?.organizationId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 })
    }

    // Get pending invites for this organization
    const invites = await db.organizationInvite.findMany({
      where: { 
        organizationId: user.organizationId,
        status: 'PENDING'
      },
      orderBy: { createdAt: 'desc' }
    })

    const response = NextResponse.json({ invites })
    
    // Cache invites for faster reloads - private cache for 1 minute
    response.headers.set('Cache-Control', 'private, max-age=60, stale-while-revalidate=120')
    
    return response
  } catch (error) {
    console.error("Error fetching invites:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export const runtime = "nodejs" 