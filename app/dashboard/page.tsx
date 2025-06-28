"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { signOut } from "@/auth"
import Link from "next/link"
import { useState, useEffect } from "react"
import { Plus, Trash2, MoreVertical, Settings, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"

interface Board {
  id: string
  name: string
  description: string | null
  createdAt: string
  updatedAt: string
}

interface User {
  id: string
  name: string | null
  email: string
  organization: {
    name: string
  } | null
}

export default function Dashboard() {
  const [boards, setBoards] = useState<Board[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddBoard, setShowAddBoard] = useState(false)
  const [newBoardName, setNewBoardName] = useState("")
  const [newBoardDescription, setNewBoardDescription] = useState("")
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const router = useRouter()

  useEffect(() => {
    fetchUserAndBoards()
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

  const fetchUserAndBoards = async () => {
    try {
      // Get user info first to check authentication
      const userResponse = await fetch("/api/user")
      if (userResponse.status === 401) {
        router.push("/auth/signin")
        return
      }
      
      if (userResponse.ok) {
        const userData = await userResponse.json()
        setUser(userData)
        
        // Check if user needs to complete profile setup
        if (!userData.name) {
          router.push("/setup/profile")
          return
        }
        
        // Check if user needs to complete organization setup
        if (!userData.organization) {
          router.push("/setup/organization")
          return
        }
      }

      // Fetch boards
      const boardsResponse = await fetch("/api/boards")
      if (boardsResponse.ok) {
        const { boards } = await boardsResponse.json()
        setBoards(boards)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddBoard = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBoardName.trim()) return

    try {
      const response = await fetch("/api/boards", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newBoardName,
          description: newBoardDescription,
        }),
      })

      if (response.ok) {
        const { board } = await response.json()
        setBoards([board, ...boards])
        setNewBoardName("")
        setNewBoardDescription("")
        setShowAddBoard(false)
      }
    } catch (error) {
      console.error("Error creating board:", error)
    }
  }

  const handleDeleteBoard = async (boardId: string) => {
    if (!confirm("Are you sure you want to delete this board?")) return

    try {
      const response = await fetch(`/api/boards/${boardId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setBoards(boards.filter(board => board.id !== boardId))
      }
    } catch (error) {
      console.error("Error deleting board:", error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Navigation Bar */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-2xl font-bold text-blue-600">Gumboard</h1>
              </div>
            </div>

                         {/* User Dropdown */}
             <div className="relative user-dropdown">
               <button
                 onClick={() => setShowUserDropdown(!showUserDropdown)}
                 className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
               >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-white">
                    {user?.name ? user.name.charAt(0).toUpperCase() : user?.email?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium">
                  {user?.name?.split(' ')[0] || 'User'}
                </span>
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
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Boards</h2>
              <p className="text-gray-600 mt-1">
                Manage your organization's boards
              </p>
            </div>
            <Button
              onClick={() => setShowAddBoard(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Board</span>
            </Button>
          </div>
        </div>

        {/* Add Board Modal */}
        {showAddBoard && (
          <div 
            className="fixed inset-0 flex items-center justify-center z-50"
            onClick={() => {
              setShowAddBoard(false)
              setNewBoardName("")
              setNewBoardDescription("")
            }}
          >
            <div 
              className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl border border-gray-200"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold mb-4">Create New Board</h3>
              <form onSubmit={handleAddBoard}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Board Name
                    </label>
                    <Input
                      type="text"
                      value={newBoardName}
                      onChange={(e) => setNewBoardName(e.target.value)}
                      placeholder="Enter board name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description (Optional)
                    </label>
                    <Input
                      type="text"
                      value={newBoardDescription}
                      onChange={(e) => setNewBoardDescription(e.target.value)}
                      placeholder="Enter board description"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowAddBoard(false)
                      setNewBoardName("")
                      setNewBoardDescription("")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">Create Board</Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Boards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {boards.map((board) => (
            <Card key={board.id} className="group hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{board.name}</CardTitle>
                    {board.description && (
                      <CardDescription className="mt-1">
                        {board.description}
                      </CardDescription>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteBoard(board.id)}
                    className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 p-1 rounded transition-opacity"
                    title="Delete board"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {boards.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <Plus className="w-12 h-12 mx-auto" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No boards yet</h3>
            <p className="text-gray-500 mb-4">
              Get started by creating your first board
            </p>
            <Button onClick={() => setShowAddBoard(true)}>
              Create Your First Board
            </Button>
          </div>
        )}
      </div>
    </div>
  )
} 