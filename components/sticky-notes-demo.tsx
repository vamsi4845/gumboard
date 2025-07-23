"use client"

import * as React from "react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { StickyNoteCard, type Note } from "@/components/sticky-note-card"
import { Plus } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

const initialNotes: Note[] = [
  {
    id: 1,
    author: { name: "Sahil", initial: "S" },
    color: "bg-green-200/70",
    tasks: [
      { id: 101, text: "Gumboard release by Friday", completed: false },
      { id: 102, text: "Finance update by Friday", completed: false },
      { id: 103, text: "Jacquez", completed: true },
    ],
  },
  {
    id: 2,
    author: { name: "Michelle", initial: "M" },
    color: "bg-purple-200/60",
    tasks: [
      { id: 201, text: "Helper Tix (Mon-Fri)", completed: false },
      { id: 202, text: "Active Refunds (2x a week)", completed: false },
      { id: 203, text: "Card Tester Metabase (DAILY)", completed: true },
    ],
  },
  {
    id: 3,
    author: { name: "Steve", initial: "S" },
    color: "bg-blue-200/60",
    tasks: [
      { id: 301, text: "Review support huddle", completed: false },
      { id: 302, text: "Metabase queries", completed: false },
    ],
  },
  {
    id: 4,
    author: { name: "Daniel", initial: "D" },
    color: "bg-pink-200/70",
    tasks: [
      { id: 401, text: "Fixed unnecessary description", completed: false },
      { id: 402, text: "PR reviews", completed: true },
    ],
  },
]

const noteColors = ["bg-yellow-200/70", "bg-teal-200/70", "bg-orange-200/70"]
const authors = [
  { name: "Jono", initial: "J" },
  { name: "Sherry", initial: "S" },
  { name: "Maya", initial: "M" },
]

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
}

const itemVariants = {
  hidden: { y: 20, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
}

export function StickyNotesDemo() {
  const [notes, setNotes] = useState<Note[]>(initialNotes)

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)))
  }

  const handleDeleteNote = (noteId: number) => {
    setNotes(notes.filter((note) => note.id !== noteId))
  }

  const handleAddNote = () => {
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)]
    const randomAuthor = authors[Math.floor(Math.random() * authors.length)]
    const newNote: Note = {
      id: Date.now(),
      author: randomAuthor,
      color: randomColor,
      tasks: [{ id: Date.now() + 1, text: "New to-do", completed: false }],
    }
    setNotes([...notes, newNote])
  }

  return (
    <div className="relative">
      <div className="mb-4 flex items-center justify-end">
        <Button size="sm" onClick={handleAddNote}>
          <Plus className="mr-2 h-4 w-4" />
          Add Note
        </Button>
      </div>
      <div>
        <motion.div
          className="columns-1 gap-4 sm:columns-2"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <AnimatePresence>
            {notes.map((note) => (
              <motion.div key={note.id} className="mb-4 break-inside-avoid" variants={itemVariants} exit="exit" layout>
                <StickyNoteCard note={note} onUpdate={handleUpdateNote} onDelete={handleDeleteNote} />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
