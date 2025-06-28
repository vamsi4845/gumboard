import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"

async function createOrganization(formData: FormData) {
  "use server"
  
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Not authenticated")
  }

  const orgName = formData.get("organizationName") as string
  const teamEmails = formData.get("teamEmails") as string

  if (!orgName?.trim()) {
    throw new Error("Organization name is required")
  }

  // Create organization
  const organization = await db.organization.create({
    data: {
      name: orgName.trim(),
    }
  })

  // Update user to belong to this organization
  await db.user.update({
    where: { id: session.user.id },
    data: { organizationId: organization.id }
  })

  // Send invites to team members if provided
  if (teamEmails?.trim()) {
    const emails = teamEmails.split('\n')
      .map(email => email.trim())
      .filter(email => email && email.includes('@'))

    if (emails.length > 0) {
      await db.organizationInvite.createMany({
        data: emails.map(email => ({
          email,
          organizationId: organization.id,
          invitedBy: session.user.id!
        })),
        skipDuplicates: true
      })
    }
  }

  redirect("/dashboard")
}

export default async function OrganizationSetup() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  // If user doesn't have a name, redirect to profile setup
  if (!session.user.name) {
    redirect("/setup/profile")
  }

  // Check if user already has an organization
  const user = await db.user.findUnique({
    where: { id: session.user.id },
    include: { organization: true }
  })
  
  if (user?.organization) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Setup Your Organization</h1>
            <p className="text-muted-foreground">
              Create your workspace and invite your team
            </p>
          </div>

          {/* Organization Setup Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-blue-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {session.user.name?.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl">Welcome, {session.user.name}!</CardTitle>
              <CardDescription className="text-base">
                Let's set up your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createOrganization} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name</Label>
                  <Input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder="Enter your organization name"
                    required
                    className="w-full"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="teamEmails">Team Member Email Addresses</Label>
                  <textarea
                    id="teamEmails"
                    name="teamEmails"
                    placeholder="Enter email addresses (one per line)&#10;example@company.com&#10;teammate@company.com"
                    rows={5}
                    className="w-full px-3 py-2 text-sm border border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md resize-none"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter one email address per line. We'll send them invitations to join your organization.
                  </p>
                </div>
                
                <Button type="submit" className="w-full">
                  Save & Send Invites
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
} 