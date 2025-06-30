"use client"

import { useState, useEffect } from "react"
import { useRouter, usePathname } from "next/navigation"
import { Button } from "@/components/ui/button"
import { User, Building2, ArrowLeft, Settings, LogOut, ChevronDown } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { FullPageLoader } from "@/components/ui/loader"

interface User {
  id: string
  name: string | null
  email: string
  organization: {
    id: string
    name: string
    members: {
      id: string
      name: string | null
      email: string
    }[]
  } | null
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    fetchUserData()
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element
        if (!target.closest('.user-dropdown')) {
          setShowUserDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showUserDropdown])

  const fetchUserData = async () => {
    try {
      const response = await fetch("/api/user")
      if (response.status === 401) {
        router.push("/auth/signin")
        return
      }
      
      if (response.ok) {
        const userData = await response.json()
        setUser(userData)
      }
    } catch (error) {
      console.error("Error fetching user data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return <FullPageLoader message="Loading settings..." />
  }

  const isProfileActive = pathname === '/settings'
  const isOrganizationActive = pathname === '/settings/organization'

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Logo and Settings */}
          <div className="flex items-center space-x-6">
            {/* Logo */}
            <Link href="/dashboard" className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
              <h1 className="text-2xl font-bold text-blue-600">Gumboard</h1>
            </Link>
          </div>

          {/* User Dropdown */}
          <div className="relative user-dropdown pr-4 sm:pr-6 lg:pr-8">
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-white">
                  {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium hidden md:inline">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 ml-1" />
            </button>

            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                <div className="py-1">
                  <div className="px-4 py-2 text-sm text-gray-500 border-b">
                    {user?.email}
                  </div>
                  <Link
                    href="/settings"
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => setShowUserDropdown(false)}
                  >
                    <Settings className="w-4 h-4 mr-2" />
                    Settings
                  </Link>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Settings Title */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back to Dashboard Button */}
        <div className="mb-6">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-gray-600 hover:text-gray-900 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Link>
        </div>
        <div className="flex flex-col lg:flex-row lg:space-x-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 mb-8 lg:mb-0">
            <nav className="space-y-2">
              <Link
                href="/settings"
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  isProfileActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-5 h-5 mr-3" />
                Profile
              </Link>
              <Link
                href="/settings/organization"
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  isOrganizationActive
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Building2 className="w-5 h-5 mr-3" />
                Organization
              </Link>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
} 