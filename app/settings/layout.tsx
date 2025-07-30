"use client"

import { ReactNode } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { User, Building2 } from "lucide-react"
import { AppLayout } from "@/components/app-layout"

interface SettingsLayoutProps {
  children: ReactNode
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const pathname = usePathname()

  const settingsNavItems = [
    {
      title: "Profile",
      href: "/settings",
      icon: User,
      isActive: pathname === "/settings"
    },
    {
      title: "Organization",
      href: "/settings/organization",
      icon: Building2,
      isActive: pathname === "/settings/organization"
    }
  ]

  return (
    <AppLayout>
      <div className="flex min-h-screen bg-gray-50 -m-4">
        <div className="w-64 bg-white border-r border-gray-200 min-h-screen">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Settings</h2>
            <nav className="space-y-2">
              {settingsNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.isActive
                      ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                      : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <item.icon className="w-4 h-4 mr-3" />
                  {item.title}
                </Link>
              ))}
            </nav>
          </div>
        </div>

        <div className="flex-1">
          {children}
        </div>
      </div>
    </AppLayout>
  )
}   