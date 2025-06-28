import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { signIn, signOut } from "@/auth"
import Link from "next/link"

export default async function Home() {
  const session = await auth()

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">Welcome to Gumboard</h1>
            <p className="text-muted-foreground">
              Modern collaboration platform with email authentication
            </p>
          </div>

          {/* Authentication Status */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Status</CardTitle>
              <CardDescription>
                {session ? "You are signed in" : "You are not signed in"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {session ? (
                <div className="space-y-4">
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <p className="font-medium text-green-800 dark:text-green-200">
                      Signed in as: {session.user?.email}
                    </p>
                    {session.user?.name && (
                      <p className="text-sm text-green-600 dark:text-green-300">
                        Name: {session.user.name}
                      </p>
                    )}
                  </div>
                  <form
                    action={async () => {
                      "use server"
                      await signOut()
                    }}
                  >
                    <Button type="submit" variant="outline" className="w-full">
                      Sign Out
                    </Button>
                  </form>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-blue-800 dark:text-blue-200">
                      Sign in to access your account and collaborate with others.
                    </p>
                  </div>
                  <Button asChild className="w-full">
                    <Link href="/auth/signin">
                      Sign In with Email
                    </Link>
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Features */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">🔐 Secure Authentication</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Magic link authentication powered by Resend ensures secure access without passwords.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">✨ Beautiful UI</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Built with shadcn/ui components for a modern, accessible user experience.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          {!session && (
            <Card>
              <CardHeader>
                <CardTitle>Quick Access</CardTitle>
                <CardDescription>
                  Try out the authentication system
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button asChild variant="outline">
                    <Link href="/login">Go to Login</Link>
                  </Button>
                  <Button asChild variant="outline">
                    <Link href="/auth/signin">Sign In Page</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
