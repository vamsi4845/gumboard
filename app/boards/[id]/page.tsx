"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Plus, ArrowLeft, Trash2, Edit3 } from "lucide-react"
import Link from "next/link"

interface Note {
  id: string
  content: string
  color: string
  x: number
  y: number
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

export default function BoardPage({ params }: { params: { id: string } }) {
  const [board, setBoard] = useState<Board | null>(null)
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [showAddNote, setShowAddNote] = useState(false)
  const [newNoteContent, setNewNoteContent] = useState("")
  const [editingNote, setEditingNote] = useState<string | null>(null)
  const [editContent, setEditContent] = useState("")
  const [draggedNote, setDraggedNote] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [dropZonePosition, setDropZonePosition] = useState<{ col: number, row: number } | null>(null)
  const [temporarilyDisplacedNotes, setTemporarilyDisplacedNotes] = useState<Map<string, { originalCol: number, originalRow: number, tempCol: number, tempRow: number }>>(new Map())
  const boardRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Grid configuration
  const GRID_SIZE = 208 // Note width (192) + gap (16)
  const GRID_START_X = 20
  const GRID_START_Y = 80

  // Helper functions for grid positioning
  const pixelsToGrid = (x: number, y: number) => ({
    col: Math.round((x - GRID_START_X) / GRID_SIZE),
    row: Math.round((y - GRID_START_Y) / GRID_SIZE)
  })

  const gridToPixels = (col: number, row: number) => ({
    x: GRID_START_X + (col * GRID_SIZE),
    y: GRID_START_Y + (row * GRID_SIZE)
  })

  const isGridPositionOccupied = (col: number, row: number, excludeNoteId?: string) => {
    return notes.some(note => {
      if (excludeNoteId && note.id === excludeNoteId) return false
      const noteGrid = pixelsToGrid(note.x, note.y)
      return noteGrid.col === col && noteGrid.row === row
    })
  }

  const findNearestAvailablePosition = (targetCol: number, targetRow: number, excludeNoteIds: string[] = []) => {
    // Start from target position and spiral outward to find available spot
    for (let radius = 0; radius < 20; radius++) {
      for (let dx = -radius; dx <= radius; dx++) {
        for (let dy = -radius; dy <= radius; dy++) {
          if (Math.abs(dx) === radius || Math.abs(dy) === radius || radius === 0) {
            const col = Math.max(0, targetCol + dx)
            const row = Math.max(0, targetRow + dy)
            
            // Check if position is available
            const isOccupied = notes.some(note => {
              if (excludeNoteIds.includes(note.id)) return false
              const noteGrid = pixelsToGrid(note.x, note.y)
              return noteGrid.col === col && noteGrid.row === row
            })
            
            if (!isOccupied) {
              return { col, row }
            }
          }
        }
      }
    }
    return { col: targetCol, row: targetRow } // Fallback
  }

  const findNextAvailablePosition = (startCol: number, startRow: number, excludeNoteIds: string[] = []) => {
    const maxColumns = Math.floor((window.innerWidth - 40) / GRID_SIZE)
    
    // First try to the left on the same row
    for (let col = startCol - 1; col >= 0; col--) {
      const isOccupied = notes.some(note => {
        if (excludeNoteIds.includes(note.id)) return false
        const noteGrid = pixelsToGrid(note.x, note.y)
        return noteGrid.col === col && noteGrid.row === startRow
      })
      if (!isOccupied) {
        return { col, row: startRow }
      }
    }
    
    // Then try to the right on the same row
    for (let col = startCol + 1; col < maxColumns; col++) {
      const isOccupied = notes.some(note => {
        if (excludeNoteIds.includes(note.id)) return false
        const noteGrid = pixelsToGrid(note.x, note.y)
        return noteGrid.col === col && noteGrid.row === startRow
      })
      if (!isOccupied) {
        return { col, row: startRow }
      }
    }
    
    // If no space on the same row, try next row from the beginning
    for (let row = startRow + 1; row < 50; row++) {
      for (let col = 0; col < maxColumns; col++) {
        const isOccupied = notes.some(note => {
          if (excludeNoteIds.includes(note.id)) return false
          const noteGrid = pixelsToGrid(note.x, note.y)
          return noteGrid.col === col && noteGrid.row === row
        })
        if (!isOccupied) {
          return { col, row }
        }
      }
    }
    
    return { col: Math.max(0, startCol - 1), row: startRow } // Fallback to left
  }

  useEffect(() => {
    fetchBoardData()
  }, [params.id])

  const fetchBoardData = async () => {
    try {
      // Fetch board info
      const boardResponse = await fetch(`/api/boards/${params.id}`)
      if (boardResponse.status === 401) {
        router.push("/auth/signin")
        return
      }
      if (boardResponse.ok) {
        const { board } = await boardResponse.json()
        setBoard(board)
      }

      // Fetch notes
      const notesResponse = await fetch(`/api/boards/${params.id}/notes`)
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

    // Find next available grid position (left to right, top to bottom)
    let availablePosition = { col: 0, row: 0 }
    const maxColumns = Math.floor((window.innerWidth - 40) / GRID_SIZE)
    
    // Search for the first available position
    outerLoop: for (let row = 0; row < 50; row++) {
      for (let col = 0; col < maxColumns; col++) {
        const isOccupied = notes.some(note => {
          const noteGrid = pixelsToGrid(note.x, note.y)
          return noteGrid.col === col && noteGrid.row === row
        })
        if (!isOccupied) {
          availablePosition = { col, row }
          break outerLoop
        }
      }
    }

    const { x, y } = gridToPixels(availablePosition.col, availablePosition.row)

    try {
      const response = await fetch(`/api/boards/${params.id}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: newNoteContent,
          x,
          y,
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
      const response = await fetch(`/api/boards/${params.id}/notes/${noteId}`, {
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
      const response = await fetch(`/api/boards/${params.id}/notes/${noteId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setNotes(notes.filter(n => n.id !== noteId))
      }
    } catch (error) {
      console.error("Error deleting note:", error)
    }
  }

  const handleMouseDown = (e: React.MouseEvent, noteId: string) => {
    const note = notes.find(n => n.id === noteId)
    if (!note) return

    const rect = e.currentTarget.getBoundingClientRect()
    setDragOffset({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    })
    setDraggedNote(noteId)
    e.preventDefault()
  }

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedNote || !boardRef.current) return

    const boardRect = boardRef.current.getBoundingClientRect()
    const rawX = e.clientX - boardRect.left - dragOffset.x
    const rawY = e.clientY - boardRect.top - dragOffset.y

    // Snap to grid during drag for visual feedback
    const targetGrid = pixelsToGrid(rawX, rawY)
    const clampedGrid = { col: Math.max(0, targetGrid.col), row: Math.max(0, targetGrid.row) }
    const { x, y } = gridToPixels(clampedGrid.col, clampedGrid.row)

    // Check if there's a note at the target position (excluding the dragged note)
    const noteAtTarget = notes.find(note => {
      if (note.id === draggedNote) return false
      const noteGrid = pixelsToGrid(note.x, note.y)
      return noteGrid.col === clampedGrid.col && noteGrid.row === clampedGrid.row
    })

    // Set drop zone position only for valid positions (empty spots or spots with displaceable notes)
    setDropZonePosition(clampedGrid)

    let newDisplacedNotes = new Map(temporarilyDisplacedNotes)

    if (noteAtTarget) {
      // Find a position to the right for the displaced note
      const noteGrid = pixelsToGrid(noteAtTarget.x, noteAtTarget.y)
      const newPosition = findNextAvailablePosition(
        clampedGrid.col, 
        clampedGrid.row, 
        [draggedNote, ...Array.from(newDisplacedNotes.keys())]
      )
      
      // Store the displacement information
      newDisplacedNotes.set(noteAtTarget.id, {
        originalCol: noteGrid.col,
        originalRow: noteGrid.row,
        tempCol: newPosition.col,
        tempRow: newPosition.row
      })
    }

    // Clear displacements for notes that are no longer being displaced
    // (when the dragged note moves away from their original positions)
    for (const [noteId, displacement] of newDisplacedNotes.entries()) {
      if (displacement.originalCol !== clampedGrid.col || displacement.originalRow !== clampedGrid.row) {
        newDisplacedNotes.delete(noteId)
      }
    }

    setTemporarilyDisplacedNotes(newDisplacedNotes)

    // Update note positions with temporary displacements
    setNotes(notes.map(note => {
      if (note.id === draggedNote) {
        return { ...note, x, y }
      }
      
      const displacement = newDisplacedNotes.get(note.id)
      if (displacement) {
        const { x: tempX, y: tempY } = gridToPixels(displacement.tempCol, displacement.tempRow)
        return { ...note, x: tempX, y: tempY }
      }
      
      return note
    }))
  }

  const handleMouseUp = async () => {
    if (!draggedNote) return

    const note = notes.find(n => n.id === draggedNote)
    const currentDraggedNote = draggedNote
    const currentDisplacedNotes = new Map(temporarilyDisplacedNotes)
    
    // Clear drag state immediately
    setDraggedNote(null)
    setDropZonePosition(null)
    setTemporarilyDisplacedNotes(new Map())
    
    if (note) {
      // Find the target grid position for the dragged note
      const targetGrid = pixelsToGrid(note.x, note.y)
      
      // Check if target position is occupied (excluding the dragged note and displaced notes)
      const excludeIds = [currentDraggedNote, ...Array.from(currentDisplacedNotes.keys())]
      const isTargetOccupied = notes.some(n => {
        if (excludeIds.includes(n.id)) return false
        const nGrid = pixelsToGrid(n.x, n.y)
        return nGrid.col === targetGrid.col && nGrid.row === targetGrid.row
      })
      
      // If target is occupied, find nearest available position
      const finalPosition = isTargetOccupied 
        ? findNearestAvailablePosition(targetGrid.col, targetGrid.row, [currentDraggedNote])
        : targetGrid
        
      const { x: finalX, y: finalY } = gridToPixels(finalPosition.col, finalPosition.row)

      // Update notes state immediately to prevent visual glitches
      setNotes(prevNotes => prevNotes.map(n => 
        n.id === currentDraggedNote 
          ? { ...n, x: finalX, y: finalY }
          : n
      ))

      // Update dragged note position in database
      try {
        await fetch(`/api/boards/${params.id}/notes/${currentDraggedNote}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ x: finalX, y: finalY }),
        })
      } catch (error) {
        console.error("Error updating dragged note position:", error)
      }

      // Update displaced notes positions in database
      for (const [noteId, displacement] of currentDisplacedNotes.entries()) {
        const { x: newX, y: newY } = gridToPixels(displacement.tempCol, displacement.tempRow)
        
        try {
          await fetch(`/api/boards/${params.id}/notes/${noteId}`, {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ x: newX, y: newY }),
          })
        } catch (error) {
          console.error("Error updating displaced note position:", error)
        }
      }
    }
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="text-gray-600 hover:text-gray-900">
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{board.name}</h1>
                {board.description && (
                  <p className="text-sm text-gray-500">{board.description}</p>
                )}
              </div>
            </div>
            <Button
              onClick={() => setShowAddNote(true)}
              className="flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Note</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Board Area */}
      <div 
        ref={boardRef}
        className="relative w-full h-screen overflow-hidden"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={() => {
          handleMouseUp()
          setDropZonePosition(null)
          setTemporarilyDisplacedNotes(new Map())
        }}
        style={{
          backgroundImage: `radial-gradient(circle, #e5e7eb 1px, transparent 1px)`,
          backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
          backgroundPosition: `${GRID_START_X}px ${GRID_START_Y}px`
        }}
      >
        {/* Drop Zone Indicator */}
        {dropZonePosition && draggedNote && (
          <div
            className="absolute w-48 h-48 border-2 border-blue-400 border-dashed rounded-lg bg-blue-50 bg-opacity-50 pointer-events-none"
            style={{
              left: gridToPixels(dropZonePosition.col, dropZonePosition.row).x,
              top: gridToPixels(dropZonePosition.col, dropZonePosition.row).y,
              zIndex: 999,
            }}
          />
        )}

        {notes.map((note) => (
          <div
            key={note.id}
            className={`absolute w-48 h-48 p-4 rounded-lg shadow-md cursor-move select-none group transition-all duration-200 ${
              temporarilyDisplacedNotes.has(note.id) ? 'ring-2 ring-orange-300' : ''
            }`}
                         style={{
               backgroundColor: note.color,
               left: note.x,
               top: note.y,
               zIndex: draggedNote === note.id ? 1000 : 1,
             }}
            onMouseDown={(e) => handleMouseDown(e, note.id)}
          >
            {/* User Info Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <div className="w-7 h-7 bg-white bg-opacity-40 rounded-full flex items-center justify-center shadow-sm">
                  <span className="text-xs font-semibold text-gray-700">
                    {note.user.name ? note.user.name.charAt(0).toUpperCase() : note.user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-xs font-medium text-gray-700 truncate max-w-20">
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
                  className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-sm"
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
                  autoFocus
                />
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
                  {note.content}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Note Modal */}
      {showAddNote && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
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