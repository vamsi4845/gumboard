import Link from "next/link"
import { redirect } from "next/navigation"
import { auth } from "@/auth"
import { Button } from "@/components/ui/button"
import { StickyNote } from "lucide-react"
import { StickyNotesDemo } from "@/components/sticky-notes-demo"

export default async function HomePage() {
  const session = await auth()

  if (session?.user) {
    redirect("/dashboard")
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50 text-slate-900">
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32">
          <div className="container px-4 md:px-6">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 xl:gap-24">
              <div className="flex flex-col justify-center space-y-6">
                <div className="flex items-center gap-3">
                  <StickyNote className="h-9 w-9 text-blue-600" />
                  <span className="text-4xl font-bold">Gumboard</span>
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold tracking-tighter sm:text-5xl xl:text-6xl/none">
                    Keep on-top of your team's to-dos.
                  </h1>
                  <p className="max-w-[600px] text-slate-600 md:text-xl">
                    Gumboard is the free, real-time sticky note board that helps your team stay aligned. Try the
                    interactive demo—add notes, edit text, and complete tasks.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg">
                    <Link href="/auth/signin">Get started - it's free</Link>
                  </Button>
                </div>
              </div>
              <StickyNotesDemo />
            </div>
          </div>
        </section>
      </main>
      <footer className="w-full border-t border-slate-200 py-6">
        <div className="container text-center text-sm text-slate-600">
          A project by{" "}
          <Link
            href="https://antiwork.com"
            className="underline hover:text-slate-900"
            target="_blank"
            rel="noopener noreferrer"
          >
            Antiwork
          </Link>
        </div>
      </footer>
    </div>
  )
}   