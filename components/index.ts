// Export all reusable components
export { ChecklistItem } from "./checklist-item";
export { Note } from "./note";
export { NotesDemo } from "./notes-demo";
export { StickyNoteCard } from "./sticky-note-card";
export { StickyNotesDemo } from "./sticky-notes-demo";

// Export types for convenience
export type {
  ChecklistItem as ChecklistItemType,
  Note as NoteType,
  DemoNote,
  DemoTask,
  Board,
  User,
} from "../lib/types";