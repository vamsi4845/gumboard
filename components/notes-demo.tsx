"use client";

import * as React from "react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Note } from "@/components/note";
import { Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { Note as NoteType, ChecklistItem } from "@/lib/types";

const initialNotes: NoteType[] = [
  {
    id: "1",
    content: "",
    color: "#dcfce7", // bg-green-200/70 equivalent
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: "user1",
      name: "Sahil",
      email: "sahil@example.com",
    },
    checklistItems: [
      { id: "101", content: "Gumboard release by Friday", checked: false, order: 0 },
      { id: "102", content: "Finance update by Friday", checked: false, order: 1 },
      { id: "103", content: "Jacquez", checked: true, order: 2 },
    ],
  },
  {
    id: "2",
    content: "",
    color: "#e9d5ff", // bg-purple-200/60 equivalent
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: "user2",
      name: "Michelle",
      email: "michelle@example.com",
    },
    checklistItems: [
      { id: "201", content: "Helper Tix (Mon-Fri)", checked: false, order: 0 },
      { id: "202", content: "Active Refunds (2x a week)", checked: false, order: 1 },
      { id: "203", content: "Card Tester Metabase (DAILY)", checked: true, order: 2 },
    ],
  },
  {
    id: "3",
    content: "",
    color: "#dbeafe", // bg-blue-200/60 equivalent
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: "user3",
      name: "Steve",
      email: "steve@example.com",
    },
    checklistItems: [
      { id: "301", content: "Review support huddle", checked: false, order: 0 },
      { id: "302", content: "Metabase queries", checked: false, order: 1 },
    ],
  },
  {
    id: "4",
    content: "",
    color: "#fce7f3", // bg-pink-200/70 equivalent
    done: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    user: {
      id: "user4",
      name: "Daniel",
      email: "daniel@example.com",
    },
    checklistItems: [
      { id: "401", content: "Fixed unnecessary description", checked: false, order: 0 },
      { id: "402", content: "PR reviews", checked: true, order: 1 },
    ],
  },
];

const noteColors = ["#fef3c7", "#ccfbf1", "#fed7aa"]; // yellow, teal, orange equivalents
const authors = [
  { name: "Aaron", email: "aaron@example.com" },
  { name: "Abdul", email: "abdul@example.com" },
  { name: "Abhishek", email: "abhishek@example.com" },
  { name: "Adriano", email: "adriano@example.com" },
  { name: "Ahmad", email: "ahmad@example.com" },
  { name: "Ahmed", email: "ahmed@example.com" },
  { name: "Akshay", email: "akshay@example.com" },
  { name: "Al", email: "al@example.com" },
  { name: "Alberto", email: "alberto@example.com" },
  { name: "Alex", email: "alex@example.com" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3 },
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: { duration: 0.2 },
  },
};

export function NotesDemo() {
  const [notes, setNotes] = useState<NoteType[]>(initialNotes);

  const handleUpdateNote = (updatedNote: NoteType) => {
    setNotes(notes.map((note) => (note.id === updatedNote.id ? updatedNote : note)));
  };

  const handleDeleteNote = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  const handleAddChecklistItem = (noteId: string, content: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;

    const newItem: ChecklistItem = {
      id: `${Date.now()}`,
      content,
      checked: false,
      order: (note.checklistItems || []).length,
    };

    const updatedNote = {
      ...note,
      checklistItems: [...(note.checklistItems || []), newItem],
    };

    handleUpdateNote(updatedNote);
  };

  const handleToggleChecklistItem = (noteId: string, itemId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || !note.checklistItems) return;

    const updatedItems = note.checklistItems.map((item) =>
      item.id === itemId ? { ...item, checked: !item.checked } : item
    );

    const allItemsChecked = updatedItems.every((item) => item.checked);

    const updatedNote = {
      ...note,
      checklistItems: updatedItems,
      done: allItemsChecked,
    };

    handleUpdateNote(updatedNote);
  };

  const handleEditChecklistItem = (noteId: string, itemId: string, content: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || !note.checklistItems) return;

    const updatedItems = note.checklistItems.map((item) =>
      item.id === itemId ? { ...item, content } : item
    );

    const updatedNote = {
      ...note,
      checklistItems: updatedItems,
    };

    handleUpdateNote(updatedNote);
  };

  const handleDeleteChecklistItem = (noteId: string, itemId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || !note.checklistItems) return;

    const updatedItems = note.checklistItems.filter((item) => item.id !== itemId);
    const allItemsChecked = updatedItems.every((item) => item.checked);

    const updatedNote = {
      ...note,
      checklistItems: updatedItems,
      done: updatedItems.length > 0 ? allItemsChecked : false,
    };

    handleUpdateNote(updatedNote);
  };

  const handleToggleAllChecklistItems = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (!note || !note.checklistItems) return;

    const allChecked = note.checklistItems.every((item) => item.checked);
    const updatedItems = note.checklistItems.map((item) => ({
      ...item,
      checked: !allChecked,
    }));

    const updatedNote = {
      ...note,
      checklistItems: updatedItems,
      done: !allChecked,
    };

    handleUpdateNote(updatedNote);
  };

  const handleAddNote = () => {
    const randomColor = noteColors[Math.floor(Math.random() * noteColors.length)];
    const randomAuthor = authors[Math.floor(Math.random() * authors.length)];
    const newNote: NoteType = {
      id: `${Date.now()}`,
      content: "",
      color: randomColor,
      done: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      user: {
        id: `user-${Date.now()}`,
        name: randomAuthor.name,
        email: randomAuthor.email,
      },
      checklistItems: [
        { id: `${Date.now() + 1}`, content: "New to-do", checked: false, order: 0 },
      ],
    };
    setNotes([newNote, ...notes]);
  };

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
              <motion.div
                key={note.id}
                className="mb-4 break-inside-avoid"
                variants={itemVariants}
                exit="exit"
                layout
              >
                <Note
                  note={note}
                  currentUser={{ id: "demo-user", name: "Demo User", email: "demo@example.com" }}
                  onUpdate={handleUpdateNote}
                  onDelete={handleDeleteNote}
                  onAddChecklistItem={handleAddChecklistItem}
                  onToggleChecklistItem={handleToggleChecklistItem}
                  onEditChecklistItem={handleEditChecklistItem}
                  onDeleteChecklistItem={handleDeleteChecklistItem}
                  onToggleAllChecklistItems={handleToggleAllChecklistItems}
                  className="bg-white dark:bg-zinc-900"
                  style={{ padding: "16px" }}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}