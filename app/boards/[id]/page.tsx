"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit3, ChevronDown, Settings, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"

interface Note {
  id: string
  content: string
  color: string
  createdAt: string
  updatedAt: string
  user: {
    id: string
    name: string | null
    email: string
  }
}

interface Board {
  id: string
  name: string
  description: string | null
}

interface User {
  id: string
  name: string | null
  email: string
  organization: {
    name: string
  } | null
}

export default function BoardPage({ params }: { params: Promise<{ id: string }> }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [allBoards, setAllBoards] = useState<Board[]>([])
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [showBoardDropdown, setShowBoardDropdown] = useState(false)
  const [showUserDropdown, setShowUserDropdown] = useState(false)
  const [boardId, setBoardId] = useState<string | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Grid configuration
  const NOTE_WIDTH = 320  // Slightly smaller to fit more notes
  const GRID_GAP = 16     // Smaller gap for better space utilization
  const CONTAINER_PADDING = 16

  // Helper function to calculate note height based on content
  const calculateNoteHeight = (content: string) => {
    const lines = content.split('\n')
    const lineCount = Math.max(lines.length, 3)
    // Base height for header + padding, plus line height for content
    return 120 + (lineCount * 24) // Adjusted for better spacing
  }

  // Helper function to calculate grid layout for desktop
  const calculateGridLayout = () => {
    if (typeof window === 'undefined') return []
    
    const containerWidth = window.innerWidth - (CONTAINER_PADDING * 2)
    const noteWidthWithGap = NOTE_WIDTH + GRID_GAP
    const columnsCount = Math.floor((containerWidth + GRID_GAP) / noteWidthWithGap)
    const actualColumnsCount = Math.max(1, columnsCount)
    
    // Calculate the actual available width and adjust note width to fill better
    const availableWidthForNotes = containerWidth - ((actualColumnsCount - 1) * GRID_GAP)
    const calculatedNoteWidth = Math.floor(availableWidthForNotes / actualColumnsCount)
    // Ensure notes don't get too narrow or too wide
    const adjustedNoteWidth = Math.max(280, Math.min(400, calculatedNoteWidth))
    
    // Use full width with minimal left offset
    const offsetX = CONTAINER_PADDING
    
    // Group notes by rows and calculate proper Y positions
    const rowHeights: number[] = []
    const layoutedNotes = notes.map((note, index) => {
      const col = index % actualColumnsCount
      const row = Math.floor(index / actualColumnsCount)
      const noteHeight = calculateNoteHeight(note.content)
      
      // Track the maximum height for each row
      if (!rowHeights[row]) {
        rowHeights[row] = noteHeight
      } else {
        rowHeights[row] = Math.max(rowHeights[row], noteHeight)
      }
      
      return { note, col, row, noteHeight }
    })
    
    // Calculate Y positions based on accumulated row heights
    const rowYPositions: number[] = [CONTAINER_PADDING]
    for (let i = 1; i < rowHeights.length; i++) {
      rowYPositions[i] = rowYPositions[i - 1] + rowHeights[i - 1] + GRID_GAP
    }
    
    return layoutedNotes.map(({ note, col, row, noteHeight }) => {
      const x = offsetX + (col * (adjustedNoteWidth + GRID_GAP))
      const y = rowYPositions[row] || CONTAINER_PADDING
      
      return {
        ...note,
        x,
        y,
        width: adjustedNoteWidth,
        height: noteHeight
      }
    })
  }

  // Helper function to calculate mobile layout (single column)
  const calculateMobileLayout = () => {
    if (typeof window === 'undefined') return []
    
    let currentY = CONTAINER_PADDING
    
    return notes.map((note) => {
      const noteHeight = calculateNoteHeight(note.content)
      const y = currentY
      currentY += noteHeight + GRID_GAP
      
      return {
        ...note,
        x: CONTAINER_PADDING,
        y,
        width: window.innerWidth - (CONTAINER_PADDING * 2),
        height: noteHeight
      }
    })
  }

  useEffect(() => {
    const initializeParams = async () => {
      const resolvedParams = await params
      setBoardId(resolvedParams.id)
    }
    initializeParams()
  }, [params])

  useEffect(() => {
    if (boardId) {
      fetchBoardData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBoardDropdown || showUserDropdown) {
        const target = event.target as Element
        if (!target.closest('.board-dropdown') && !target.closest('.user-dropdown')) {
          setShowBoardDropdown(false)
          setShowUserDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showBoardDropdown, showUserDropdown])

  // Check if mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        setIsMobile(window.innerWidth < 768) // Use tablet breakpoint for better mobile experience
      }
    }
    
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])



  const fetchBoardData = async () => {
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
      }

      // Fetch all boards for the dropdown
      const allBoardsResponse = await fetch("/api/boards")
      if (allBoardsResponse.ok) {
        const { boards } = await allBoardsResponse.json()
        setAllBoards(boards)
      }

      // Fetch current board info
      const boardResponse = await fetch(`/api/boards/${boardId}`)
      if (boardResponse.status === 401) {
        router.push("/auth/signin")
        return
      }
      if (boardResponse.ok) {
        const { board } = await boardResponse.json()
        setBoard(board)
      }

      // Fetch notes
      const notesResponse = await fetch(`/api/boards/${boardId}/notes`)
      if (notesResponse.ok) {
        const { notes } = await notesResponse.json()
        setNotes(notes)
      }
    } catch (error) {
      console.error("Error fetching board data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newNoteContent.trim()) return

    try {
      const response = await fetch(`/api/boards/${boardId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newNoteContent,
        }),
      })

      if (response.ok) {
        const { note } = await response.json()
        setNotes([...notes, note])
        setNewNoteContent("")
        setShowAddNote(false)
      }
    } catch (error) {
      console.error("Error creating note:", error)
    }
  }

  const handleUpdateNote = async (noteId: string, content: string) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ content }),
      })

      if (response.ok) {
        const { note } = await response.json()
        setNotes(notes.map(n => n.id === noteId ? note : n))
        setEditingNote(null)
        setEditContent("")
      }
    } catch (error) {
      console.error("Error updating note:", error)
    }
  }

  const handleDeleteNote = async (noteId: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return

    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId))
      }
    } catch (error) {
      console.error("Error deleting note:", error)
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

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Board not found</div>
      </div>
    )
  }

  const layoutNotes = isMobile ? calculateMobileLayout() : calculateGridLayout()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Company name and board selector */}
          <div className="flex items-center space-x-6">
            {/* Company Name */}
            <Link href="/dashboard" className="flex-shrink-0 pl-4 sm:pl-6 lg:pl-8">
              <h1 className="text-2xl font-bold text-blue-600">Gumboard</h1>
            </Link>
              
            {/* Board Selector Dropdown */}
            <div className="relative board-dropdown hidden md:block">
              <button
                onClick={() => setShowBoardDropdown(!showBoardDropdown)}
                className="flex items-center space-x-2 text-gray-700 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md px-3 py-2"
              >
                <div>
                  <div className="text-lg font-semibold text-gray-900">{board?.name}</div>
                  {board?.description && (
                    <div className="text-sm text-gray-500">{board.description}</div>
                  )}
                </div>
                <ChevronDown className="w-4 h-4 ml-1" />
              </button>

              {showBoardDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                  <div className="py-1">
                    {allBoards.map((b) => (
                      <Link
                        key={b.id}
                        href={`/boards/${b.id}`}
                        className={`block px-4 py-2 text-sm hover:bg-gray-100 ${
                          b.id === boardId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                        onClick={() => setShowBoardDropdown(false)}
                      >
                        <div className="font-medium">{b.name}</div>
                        {b.description && (
                          <div className="text-xs text-gray-500 mt-1">{b.description}</div>
                        )}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Add Note and User dropdown */}
          <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
            <Button
              onClick={() => setShowAddNote(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden md:inline">Add Note</span>
            </Button>
            
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
        </div>
      </div>

      {/* Mobile Board Title */}
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3">
        <h2 className="text-lg font-semibold text-gray-900">{board?.name}</h2>
        {board?.description && (
          <p className="text-sm text-gray-500">{board.description}</p>
        )}
      </div>

      {/* Board Area */}
      <div 
        ref={boardRef}
        className="relative w-full pb-8 bg-gray-50"
        style={{
          minHeight: 'calc(100vh - 64px)', // Account for header height
        }}
      >
        {/* Notes */}
        <div className="relative w-full h-full">
          {layoutNotes.map((note) => (
            <div
              key={note.id}
              className="absolute p-4 rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200"
              style={{
                backgroundColor: note.color,
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
              }}
              onDoubleClick={() => {
                setEditingNote(note.id)
                setEditContent(note.content)
              }}
            >
              {/* User Info Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-white bg-opacity-40 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-sm font-semibold text-gray-700">
                      {note.user.name ? note.user.name.charAt(0).toUpperCase() : note.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-700 truncate max-w-20">
                    {note.user.name ? note.user.name.split(' ')[0] : note.user.email.split('@')[0]}
                  </span>
                </div>
                <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setEditingNote(note.id)
                      setEditContent(note.content)
                    }}
                    className="p-1 text-gray-600 hover:text-blue-600 rounded"
                  >
                    <Edit3 className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteNote(note.id)
                    }}
                    className="p-1 text-gray-600 hover:text-red-600 rounded"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              </div>
              
              {editingNote === note.id ? (
                <div className="flex-1">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base"
                    placeholder="Enter note content..."
                    onBlur={() => handleUpdateNote(note.id, editContent)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && e.ctrlKey) {
                        handleUpdateNote(note.id, editContent)
                      }
                      if (e.key === 'Escape') {
                        setEditingNote(null)
                        setEditContent("")
                      }
                    }}
                    onFocus={(e) => {
                      // Set cursor at the end of the text
                      const length = e.target.value.length
                      e.target.setSelectionRange(length, length)
                    }}
                    autoFocus
                  />
                </div>
              ) : (
                <div className="flex-1">
                  <p className="text-base text-gray-800 whitespace-pre-wrap break-words">
                    {note.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {notes.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <div className="text-xl mb-2">No notes yet</div>
            <div className="text-sm mb-4">Click &ldquo;Add Note&rdquo; to get started</div>
            <Button
              onClick={() => setShowAddNote(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Note</span>
            </Button>
          </div>
        )}
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddNote(false)
            setNewNoteContent("")
          }}
        >
          <div 
            className="bg-white rounded-lg p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold mb-4">Add New Note</h3>
            <form onSubmit={handleAddNote}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Note Content
                  </label>
                  <textarea
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                    placeholder="Enter your note..."
                    className="w-full h-32 p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddNote(false)
                    setNewNoteContent("")
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">Add Note</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
} 