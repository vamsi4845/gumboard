"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Edit3, ChevronDown, Settings, LogOut, Search, User, ArrowUpDown } from "lucide-react"
import Link from "next/link"
import { signOut } from "next-auth/react"
import { FullPageLoader } from "@/components/ui/loader"
import { DateRangePicker } from "@/components/ui/date-range-picker"

interface Note {
  id: string
  content: string
  color: string
  done: boolean
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
  isAdmin: boolean
  organization: {
    name: string
  } | null
}

type SortOption = 'created-desc' | 'created-asc' | 'author-name'

const SORT_OPTIONS = [
  { value: 'created-desc' as SortOption, label: 'Newest First', description: 'Created at (descending)' },
  { value: 'created-asc' as SortOption, label: 'Oldest First', description: 'Created at (ascending)' },
  { value: 'author-name' as SortOption, label: 'Author Name', description: 'Alphabetical by author' },
] as const

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
  const [searchTerm, setSearchTerm] = useState("")
  const [dateRange, setDateRange] = useState<{ startDate: Date | null; endDate: Date | null }>({
    startDate: null,
    endDate: null
  })
  const [selectedAuthor, setSelectedAuthor] = useState<string | null>(null)
  const [showAuthorDropdown, setShowAuthorDropdown] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('created-desc')
  const [showSortDropdown, setShowSortDropdown] = useState(false)
  const boardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Grid configuration
  const NOTE_WIDTH = 320  // Base width for calculations
  const GRID_GAP = 20     // Even spacing between notes
  const CONTAINER_PADDING = 20 // Padding from edges
  const NOTE_PADDING = 16 // Internal note padding

  // Helper function to calculate note height based on content
  const calculateNoteHeight = (content: string, noteWidth?: number) => {
    const lines = content.split('\n')
    
    // Estimate character width and calculate text wrapping
    const avgCharWidth = 9 // Average character width in pixels
    const contentWidth = (noteWidth || 320) - (NOTE_PADDING * 2) - 16 // Note width minus padding and margins
    const charsPerLine = Math.floor(contentWidth / avgCharWidth)
    
    // Calculate total lines including wrapped text
    let totalLines = 0
    lines.forEach(line => {
      if (line.length === 0) {
        totalLines += 1 // Empty line
      } else {
        const wrappedLines = Math.ceil(line.length / charsPerLine)
        totalLines += Math.max(1, wrappedLines)
      }
    })
    
    // Ensure minimum content
    totalLines = Math.max(3, totalLines)
    
    // Calculate based on actual text content with wrapping
    const headerHeight = 76 // User info header + margins (more accurate)
    const paddingHeight = NOTE_PADDING * 2 // Top and bottom padding
    const lineHeight = 28 // Line height for readability (leading-7)
    const contentHeight = totalLines * lineHeight
    const minContentHeight = 84 // Minimum content area (3 lines)
    
    return headerHeight + paddingHeight + Math.max(minContentHeight, contentHeight)
  }

  // Helper function to calculate bin-packed layout for desktop
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
    
    // Bin-packing algorithm: track the bottom Y position of each column
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(CONTAINER_PADDING)
    
    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(note.content, adjustedNoteWidth)
      
      // Find the column with the lowest bottom position
      let bestColumn = 0
      let minBottom = columnBottoms[0]
      
      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col]
          bestColumn = col
        }
      }
      
      // Place the note in the best column
      const x = offsetX + (bestColumn * (adjustedNoteWidth + GRID_GAP))
      const y = columnBottoms[bestColumn]
      
      // Update the column bottom position
      columnBottoms[bestColumn] = y + noteHeight + GRID_GAP
      
      return {
        ...note,
        x,
        y,
        width: adjustedNoteWidth,
        height: noteHeight
      }
    })
  }

  // Helper function to calculate mobile layout (optimized single/double column)
  const calculateMobileLayout = () => {
    if (typeof window === 'undefined') return []
    
    const containerWidth = window.innerWidth - (CONTAINER_PADDING * 2)
    const minNoteWidth = 280
    const columnsCount = Math.floor((containerWidth + GRID_GAP) / (minNoteWidth + GRID_GAP))
    const actualColumnsCount = Math.max(1, columnsCount)
    
    // Calculate note width for mobile
    const availableWidthForNotes = containerWidth - ((actualColumnsCount - 1) * GRID_GAP)
    const noteWidth = Math.floor(availableWidthForNotes / actualColumnsCount)
    
    // Bin-packing for mobile with fewer columns
    const columnBottoms: number[] = new Array(actualColumnsCount).fill(CONTAINER_PADDING)
    
    return filteredNotes.map((note) => {
      const noteHeight = calculateNoteHeight(note.content, noteWidth)
      
      // Find the column with the lowest bottom position
      let bestColumn = 0
      let minBottom = columnBottoms[0]
      
      for (let col = 1; col < actualColumnsCount; col++) {
        if (columnBottoms[col] < minBottom) {
          minBottom = columnBottoms[col]
          bestColumn = col
        }
      }
      
      // Place the note in the best column
      const x = CONTAINER_PADDING + (bestColumn * (noteWidth + GRID_GAP))
      const y = columnBottoms[bestColumn]
      
      // Update the column bottom position
      columnBottoms[bestColumn] = y + noteHeight + GRID_GAP
      
      return {
        ...note,
        x,
        y,
        width: noteWidth,
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

  // Close dropdowns when clicking outside and handle escape key
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showBoardDropdown || showUserDropdown || showAuthorDropdown || showSortDropdown) {
        const target = event.target as Element
        if (!target.closest('.board-dropdown') && !target.closest('.user-dropdown') && !target.closest('.author-dropdown') && !target.closest('.sort-dropdown')) {
          setShowBoardDropdown(false)
          setShowUserDropdown(false)
          setShowAuthorDropdown(false)
          setShowSortDropdown(false)
        }
      }
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showAddNote) {
          setShowAddNote(false)
          setNewNoteContent("")
        }
        if (showBoardDropdown) {
          setShowBoardDropdown(false)
        }
        if (showUserDropdown) {
          setShowUserDropdown(false)
        }
        if (showAuthorDropdown) {
          setShowAuthorDropdown(false)
        }
        if (showSortDropdown) {
          setShowSortDropdown(false)
        }
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [showBoardDropdown, showUserDropdown, showAuthorDropdown, showSortDropdown, showAddNote])

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

  // Get unique authors from notes
  const getUniqueAuthors = (notes: Note[]) => {
    const authorsMap = new Map<string, { id: string; name: string; email: string }>()
    
    notes.forEach(note => {
      if (!authorsMap.has(note.user.id)) {
        authorsMap.set(note.user.id, {
          id: note.user.id,
          name: note.user.name || note.user.email.split('@')[0],
          email: note.user.email
        })
      }
    })
    
    return Array.from(authorsMap.values()).sort((a, b) => a.name.localeCompare(b.name))
  }

  // Filter and sort notes based on search term, date range, author, and sort option
  const filterAndSortNotes = (notes: Note[], searchTerm: string, dateRange: { startDate: Date | null; endDate: Date | null }, authorId: string | null, sortOption: SortOption): Note[] => {
    let filteredNotes = notes
    
    // Filter by search term
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase()
      filteredNotes = filteredNotes.filter(note => {
        const authorName = (note.user.name || note.user.email).toLowerCase()
        const noteContent = note.content.toLowerCase()
        return authorName.includes(search) || noteContent.includes(search)
      })
    }
    
    // Filter by author
    if (authorId) {
      filteredNotes = filteredNotes.filter(note => note.user.id === authorId)
    }
    
    // Filter by date range
    if (dateRange.startDate || dateRange.endDate) {
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.createdAt)
        const startOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())
        const endOfDay = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999)
        
        if (dateRange.startDate && dateRange.endDate) {
          return noteDate >= startOfDay(dateRange.startDate) && noteDate <= endOfDay(dateRange.endDate)
        } else if (dateRange.startDate) {
          return noteDate >= startOfDay(dateRange.startDate)
        } else if (dateRange.endDate) {
          return noteDate <= endOfDay(dateRange.endDate)
        }
        return true
      })
    }
    
    // Sort notes
    filteredNotes.sort((a, b) => {
      // Always prioritize done status first (undone notes first)
      if (a.done !== b.done) {
        return a.done ? 1 : -1 // Undone notes (false) come first
      }
      
      // Then sort by the selected option
      switch (sortOption) {
        case 'created-asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'created-desc':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        case 'author-name':
          const authorNameA = (a.user.name || a.user.email).toLowerCase()
          const authorNameB = (b.user.name || b.user.email).toLowerCase()
          return authorNameA.localeCompare(authorNameB)
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })
    
    return filteredNotes
  }

  // Get unique authors for dropdown
  const uniqueAuthors = getUniqueAuthors(notes)
  
  // Get filtered and sorted notes for display
  const filteredNotes = filterAndSortNotes(notes, searchTerm, dateRange, selectedAuthor, sortBy)



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
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to update note")
      }
    } catch (error) {
      console.error("Error updating note:", error)
      alert("Failed to update note")
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to delete note")
      }
    } catch (error) {
      console.error("Error deleting note:", error)
      alert("Failed to delete note")
    }
  }

  const handleToggleDone = async (noteId: string, currentDone: boolean) => {
    try {
      const response = await fetch(`/api/boards/${boardId}/notes/${noteId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ done: !currentDone }),
      })

      if (response.ok) {
        const { note } = await response.json()
        setNotes(notes.map(n => n.id === noteId ? note : n))
      }
    } catch (error) {
      console.error("Error toggling note done status:", error)
    }
  }

  const handleSignOut = async () => {
    await signOut()
  }

  if (loading) {
    return <FullPageLoader message="Loading board..." />
  }

  if (!board) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Board not found</div>
      </div>
    )
  }

  const layoutNotes = isMobile ? calculateMobileLayout() : calculateGridLayout()

  // Calculate the total height needed for the board area
  const calculateBoardHeight = () => {
    if (layoutNotes.length === 0) {
      return 'calc(100vh - 64px)' // Default minimum height when no notes
    }
    
    // Find the bottommost note position
    const maxBottom = Math.max(...layoutNotes.map(note => note.y + note.height))
    const minHeight = typeof window !== 'undefined' && window.innerWidth < 768 ? 500 : 600 // Different min heights for mobile/desktop
    const calculatedHeight = Math.max(minHeight, maxBottom + 100) // Add 100px padding at bottom
    
    return `${calculatedHeight}px`
  }

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

            {/* Date Range Picker */}
            <div className="hidden lg:block">
              <DateRangePicker
                startDate={dateRange.startDate}
                endDate={dateRange.endDate}
                onDateRangeChange={(startDate, endDate) => {
                  setDateRange({ startDate, endDate })
                }}
                className="min-w-fit"
              />
            </div>

            {/* Author Filter Dropdown */}
            <div className="relative author-dropdown hidden md:block">
              <button
                onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <User className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 truncate max-w-32">
                  {selectedAuthor 
                    ? uniqueAuthors.find(a => a.id === selectedAuthor)?.name || 'Unknown Author'
                    : 'All Authors'
                  }
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                  showAuthorDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {showAuthorDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setSelectedAuthor(null)
                        setShowAuthorDropdown(false)
                      }}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                        !selectedAuthor ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                      }`}
                    >
                      <User className="w-4 h-4 text-gray-500" />
                      <span className="font-medium">All Authors</span>
                    </button>
                    {uniqueAuthors.map((author) => (
                      <button
                        key={author.id}
                        onClick={() => {
                          setSelectedAuthor(author.id)
                          setShowAuthorDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                          selectedAuthor === author.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-medium text-white">
                            {author.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="font-medium truncate">{author.name}</div>
                          <div className="text-xs text-gray-500 truncate">{author.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sort Dropdown */}
            <div className="relative sort-dropdown hidden md:block">
              <button
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="flex items-center space-x-2 px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              >
                <ArrowUpDown className="w-4 h-4 text-gray-500" />
                <span className="text-gray-700 truncate max-w-32">
                  {SORT_OPTIONS.find(option => option.value === sortBy)?.label || 'Sort'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
                  showSortDropdown ? 'rotate-180' : ''
                }`} />
              </button>

              {showSortDropdown && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                  <div className="py-1">
                    {SORT_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        onClick={() => {
                          setSortBy(option.value)
                          setShowSortDropdown(false)
                        }}
                        className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                          sortBy === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                      >
                        <div className="font-medium">{option.label}</div>
                        <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right side - Search, Add Note and User dropdown */}
          <div className="flex items-center space-x-4 pr-4 sm:pr-6 lg:pr-8">
            {/* Search Box */}
            <div className="relative hidden sm:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm("")}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              )}
            </div>
            
            <Button
              onClick={() => setShowAddNote(true)}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 border-0 font-medium"
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
      <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{board?.name}</h2>
          {board?.description && (
            <p className="text-sm text-gray-500">{board.description}</p>
          )}
        </div>
        
        {/* Mobile Search Box */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white shadow-sm"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Mobile Date Range Picker */}
        <div className="lg:hidden">
          <DateRangePicker
            startDate={dateRange.startDate}
            endDate={dateRange.endDate}
            onDateRangeChange={(startDate, endDate) => {
              setDateRange({ startDate, endDate })
            }}
            className="w-full"
          />
        </div>

        {/* Mobile Author Filter */}
        <div className="md:hidden relative author-dropdown">
          <button
            onClick={() => setShowAuthorDropdown(!showAuthorDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <div className="flex items-center space-x-2">
              <User className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                {selectedAuthor 
                  ? uniqueAuthors.find(a => a.id === selectedAuthor)?.name || 'Unknown Author'
                  : 'All Authors'
                }
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
              showAuthorDropdown ? 'rotate-180' : ''
            }`} />
          </button>

          {showAuthorDropdown && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg border border-gray-200 z-50 max-h-80 overflow-y-auto">
              <div className="py-1">
                <button
                  onClick={() => {
                    setSelectedAuthor(null)
                    setShowAuthorDropdown(false)
                  }}
                  className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                    !selectedAuthor ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <User className="w-4 h-4 text-gray-500" />
                  <span className="font-medium">All Authors</span>
                </button>
                {uniqueAuthors.map((author) => (
                  <button
                    key={author.id}
                    onClick={() => {
                      setSelectedAuthor(author.id)
                      setShowAuthorDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 flex items-center space-x-3 ${
                      selectedAuthor === author.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-medium text-white">
                        {author.name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate">{author.name}</div>
                      <div className="text-xs text-gray-500 truncate">{author.email}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mobile Sort Dropdown */}
        <div className="md:hidden relative sort-dropdown">
          <button
            onClick={() => setShowSortDropdown(!showSortDropdown)}
            className="w-full flex items-center justify-between px-3 py-2 text-sm border border-gray-300 rounded-md bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
          >
            <div className="flex items-center space-x-2">
              <ArrowUpDown className="w-4 h-4 text-gray-500" />
              <span className="text-gray-700">
                {SORT_OPTIONS.find(option => option.value === sortBy)?.label || 'Sort'}
              </span>
            </div>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${
              showSortDropdown ? 'rotate-180' : ''
            }`} />
          </button>

          {showSortDropdown && (
            <div className="absolute left-0 right-0 mt-2 bg-white rounded-md shadow-lg border border-gray-200 z-50">
              <div className="py-1">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      setSortBy(option.value)
                      setShowSortDropdown(false)
                    }}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 ${
                      sortBy === option.value ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                  >
                    <div className="font-medium">{option.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Board Area */}
      <div 
        ref={boardRef}
        className="relative w-full bg-gray-50"
        style={{
          height: calculateBoardHeight(),
          minHeight: 'calc(100vh - 64px)', // Account for header height
        }}
      >
        {/* Search Results Info */}
        {(searchTerm || dateRange.startDate || dateRange.endDate || selectedAuthor || sortBy !== 'created-desc') && (
          <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 text-sm text-blue-700">
            <div className="flex flex-wrap items-center gap-2">
              <span>
                {filteredNotes.length === 1 
                  ? `1 note found` 
                  : `${filteredNotes.length} notes found`
                }
              </span>
              {searchTerm && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Search: &quot;{searchTerm}&quot;
                </span>
              )}
              {selectedAuthor && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Author: {uniqueAuthors.find(a => a.id === selectedAuthor)?.name || 'Unknown'}
                </span>
              )}
              {(dateRange.startDate || dateRange.endDate) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Date: {dateRange.startDate ? dateRange.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'} - {dateRange.endDate ? dateRange.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '...'}
                </span>
              )}
              {sortBy !== 'created-desc' && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Sort: {SORT_OPTIONS.find(option => option.value === sortBy)?.label || 'Custom'}
                </span>
              )}
              <button
                onClick={() => {
                  setSearchTerm("")
                  setDateRange({ startDate: null, endDate: null })
                  setSelectedAuthor(null)
                  setSortBy('created-desc')
                }}
                className="text-blue-600 hover:text-blue-800 text-xs underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="relative w-full h-full">
          {layoutNotes.map((note) => (
            <div
              key={note.id}
              className={`absolute rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 box-border ${
                note.done ? 'opacity-80' : ''
              }`}
              style={{
                backgroundColor: note.color,
                left: note.x,
                top: note.y,
                width: note.width,
                height: note.height,
                padding: `${NOTE_PADDING}px`,
              }}
              onDoubleClick={() => {
                // Allow editing if user is the note author or admin
                if (user?.id === note.user.id || user?.isAdmin) {
                  setEditingNote(note.id)
                  setEditContent(note.content)
                }
              }}
            >
              {/* User Info Header */}
              <div className="flex items-start justify-between mb-4 flex-shrink-0">
                <div className="flex items-center space-x-2">
                  <div className="w-7 h-7 bg-white bg-opacity-40 rounded-full flex items-center justify-center shadow-sm">
                    <span className="text-sm font-semibold text-gray-700">
                      {note.user.name ? note.user.name.charAt(0).toUpperCase() : note.user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-700 truncate max-w-20">
                      {note.user.name ? note.user.name.split(' ')[0] : note.user.email.split('@')[0]}
                    </span>
                    <span className="text-xs text-gray-500 opacity-70">
                      {new Date(note.createdAt).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: new Date(note.createdAt).getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {/* Show edit/delete buttons for note author or admin */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
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
                  )}
                  {/* Beautiful checkbox for done status - show to author or admin */}
                  {(user?.id === note.user.id || user?.isAdmin) && (
                    <div className="flex items-center">
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleToggleDone(note.id, note.done)
                        }}
                        className={`
                          relative w-5 h-5 rounded-md border-2 transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-110 z-10
                          ${note.done
                            ? 'bg-green-500 border-green-500 text-white shadow-lg opacity-100'
                            : 'bg-white bg-opacity-60 border-gray-400 hover:border-green-400 hover:bg-green-50 opacity-30 group-hover:opacity-100'
                          }
                        `}
                        title={note.done ? "Mark as not done" : "Mark as done"}
                        type="button"
                        style={{ pointerEvents: 'auto' }}
                      >
                        {note.done && (
                          <svg
                            className="w-3 h-3 text-white"
                            fill="none"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path d="M5 13l4 4L19 7"></path>
                          </svg>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              
              {editingNote === note.id ? (
                <div className="flex-1 min-h-0">
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7"
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
                <div className="flex-1 overflow-hidden flex flex-col">
                  <p className={`text-base whitespace-pre-wrap break-words leading-7 m-0 p-0 flex-1 transition-all duration-200 ${
                    note.done 
                      ? 'text-gray-500 opacity-70 line-through' 
                      : 'text-gray-800'
                  }`}>
                    {note.content}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredNotes.length === 0 && notes.length > 0 && (searchTerm || dateRange.startDate || dateRange.endDate || selectedAuthor) && (
          <div className="flex flex-col items-center justify-center h-96 text-gray-500">
            <Search className="w-12 h-12 mb-4 text-gray-400" />
            <div className="text-xl mb-2">No notes found</div>
            <div className="text-sm mb-4 text-center">
              No notes match your current filters
              {searchTerm && <div>Search: &quot;{searchTerm}&quot;</div>}
              {selectedAuthor && (
                <div>
                  Author: {uniqueAuthors.find(a => a.id === selectedAuthor)?.name || 'Unknown'}
                </div>
              )}
              {(dateRange.startDate || dateRange.endDate) && (
                <div>
                  Date range: {dateRange.startDate ? dateRange.startDate.toLocaleDateString() : '...'} - {dateRange.endDate ? dateRange.endDate.toLocaleDateString() : '...'}
                </div>
              )}
            </div>
            <Button
              onClick={() => {
                setSearchTerm("")
                setDateRange({ startDate: null, endDate: null })
                setSelectedAuthor(null)
                setSortBy('created-desc')
              }}
              variant="outline"
              className="flex items-center space-x-2"
            >
              <span>Clear All Filters</span>
            </Button>
          </div>
        )}
        
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
          className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50 p-4"
          onClick={() => {
            setShowAddNote(false)
            setNewNoteContent("")
          }}
        >
          <div 
            className="bg-white bg-opacity-95 backdrop-blur-md rounded-lg p-6 w-full max-w-md shadow-2xl drop-shadow-2xl border border-white border-opacity-30"
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