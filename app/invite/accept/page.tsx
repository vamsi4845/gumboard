import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

async function acceptInvite(token: string) {
  "use server"
  
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Not authenticated")
  }

  // Find the invite by token (ID)
  const invite = await db.organizationInvite.findUnique({
    where: { id: token },
    include: { organization: true }
  })

  if (!invite) {
    throw new Error("Invalid or expired invitation")
  }

  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address")
  }

  if (invite.status !== "PENDING") {
    throw new Error("This invitation has already been processed")
  }

  // Update user to join the organization
  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: invite.organizationId }
  })

  // Mark invite as accepted
  await db.organizationInvite.update({
    where: { id: token },
    data: { status: "ACCEPTED" }
  })

  redirect("/dashboard")
}

async function declineInvite(token: string) {
  "use server"
  
  const session = await auth()
  if (!session?.user?.email) {
    throw new Error("Not authenticated")
  }

  // Find the invite by token (ID)
  const invite = await db.organizationInvite.findUnique({
    where: { id: token }
  })

  if (!invite) {
    throw new Error("Invalid or expired invitation")
  }

  if (invite.email !== session.user.email) {
    throw new Error("This invitation is not for your email address")
  }

  // Mark invite as declined
  await db.organizationInvite.update({
    where: { id: token },
    data: { status: "DECLINED" }
  })

  redirect("/dashboard")
}

interface InviteAcceptPageProps {
  searchParams: {
    token?: string
  }
}

export default async function InviteAcceptPage({ searchParams }: InviteAcceptPageProps) {
  const session = await auth()
  const token = searchParams.token

  if (!session?.user) {
    redirect("/auth/signin")
  }

  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
                <CardDescription>
                  This invitation link is invalid or missing required information.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Find the invite by token
  const invite = await db.organizationInvite.findUnique({
    where: { id: token },
    include: { 
      organization: true,
      user: true // The user who sent the invite
    }
  })

  if (!invite) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-red-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-red-600">Invalid Invitation</CardTitle>
                <CardDescription>
                  This invitation link is invalid or has expired.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Check if the invite is for the current user's email
  if (invite.email !== session.user.email) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-yellow-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-yellow-600">Wrong Account</CardTitle>
                <CardDescription>
                  This invitation is for {invite.email}, but you're signed in as {session.user.email}.
                  Please sign in with the correct account to accept this invitation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  // Check if invite has already been processed
  if (invite.status !== "PENDING") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-md mx-auto">
            <Card className="border-2 border-blue-200">
              <CardHeader className="text-center">
                <CardTitle className="text-xl text-blue-600">
                  Invitation {invite.status === "ACCEPTED" ? "Already Accepted" : "Already Declined"}
                </CardTitle>
                <CardDescription>
                  You have already {invite.status === "ACCEPTED" ? "accepted" : "declined"} this invitation.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Organization Invitation</h1>
            <p className="text-muted-foreground">
              You've been invited to join an organization
            </p>
          </div>

          {/* Invitation Details Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {invite.organization.name.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl">{invite.organization.name}</CardTitle>
              <CardDescription className="text-base">
                {invite.user.name} ({invite.user.email}) has invited you to join their organization
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Invited: {invite.createdAt.toLocaleDateString()}
                </p>
                <p className="text-sm text-muted-foreground">
                  Your email: {invite.email}
                </p>
              </div>
              
              <div className="flex flex-col space-y-3">
                <form action={acceptInvite.bind(null, token)}>
                  <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                    Accept Invitation
                  </Button>
                </form>
                
                <form action={declineInvite.bind(null, token)}>
                  <Button type="submit" variant="outline" className="w-full">
                    Decline Invitation
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 