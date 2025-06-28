import { auth } from "@/auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { signOut } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function Dashboard() {
  const session = await auth()

  if (!session?.user) {
    redirect("/auth/signin")
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">
              Welcome back to Gumboard
            </p>
          </div>

          {/* User Profile Card */}
          <Card className="border-2">
            <CardHeader className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mx-auto mb-4 flex items-center justify-center">
                <span className="text-2xl font-bold text-white">
                  {session.user.name ? session.user.name.charAt(0).toUpperCase() : session.user.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <CardTitle className="text-xl">
                {session.user.name || "Welcome"}
              </CardTitle>
              <CardDescription className="text-base">
                {session.user.email}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3">
                <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <span className="text-sm font-medium text-green-800 dark:text-green-200">
                    Account Status
                  </span>
                  <span className="text-sm text-green-600 dark:text-green-300 font-semibold">
                    ✓ Active
                  </span>
                </div>
                
                <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Authentication
                  </span>
                  <span className="text-sm text-blue-600 dark:text-blue-300 font-semibold">
                    Email Verified
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t">
                <div className="flex gap-3">
                  <Button asChild variant="outline" className="flex-1">
                    <Link href="/">
                      ← Back to Home
                    </Link>
                  </Button>
                  <form
                    action={async () => {
                      "use server"
                      await signOut()
                    }}
                    className="flex-1"
                  >
                    <Button type="submit" variant="destructive" className="w-full">
                      Sign Out
                    </Button>
                  </form>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Account Created
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {new Date().toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Last Sign In
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">Today</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">1</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
} 