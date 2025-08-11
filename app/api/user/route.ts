import { auth } from "@/auth"
import { db } from "@/lib/db"
import { NextResponse } from "next/server"

export async function GET() {
  // Force Node runtime to avoid Prisma on Edge
  // (Next.js picks this up at route file-level, so also export below)
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get user with organization - lean select only
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true,
        name: true,
        email: true,
        isAdmin: true,
        organization: {
          select: {
            id: true,
            name: true,
            slackWebhookUrl: true
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch members separately only if needed
    let members = [];
    if (user.organization) {
      members = await db.user.findMany({
        where: { organizationId: user.organization.id },
        select: {
          id: true,
          name: true,
          email: true,
          isAdmin: true
        },
        orderBy: { name: "asc" }
      });
    }

    const response = NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      isAdmin: user.isAdmin,
      organization: user.organization ? {
        id: user.organization.id,
        name: user.organization.name,
        slackWebhookUrl: user.organization.slackWebhookUrl,
        members
      } : null
    })

    // Cache user data for faster page reloads - private cache for 2 minutes
    response.headers.set('Cache-Control', 'private, max-age=120, stale-while-revalidate=300')
    
    return response
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
} 
export const runtime = "nodejs"