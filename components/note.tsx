"use client";

import * as React from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ChecklistItemComponent, type ChecklistItem } from "./checklist-item";
import { cn } from "@/lib/utils";
import { Trash2, Plus } from "lucide-react";

export interface Note {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  checklistItems?: ChecklistItem[];
  user: {
    id: string;
    name: string | null;
    email: string;
  };
  board?: {
    id: string;
    name: string;
  };
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

interface NoteProps {
  note: Note;
  user?: {
    id: string;
    isAdmin?: boolean;
  };
  boardId?: string;
  editingNote?: string | null;
  editContent?: string;
  setEditingNote?: (noteId: string | null) => void;
  setEditContent?: (content: string) => void;
  editingChecklistItem?: {
    noteId: string;
    itemId: string;
  } | null;
  editingChecklistItemContent?: string;
  setEditingChecklistItem?: (item: { noteId: string; itemId: string } | null) => void;
  setEditingChecklistItemContent?: (content: string) => void;
  addingChecklistItem?: string | null;
  newChecklistItemContent?: string;
  setAddingChecklistItem?: (noteId: string | null) => void;
  setNewChecklistItemContent?: (content: string) => void;
  animatingItems?: Set<string>;
  editDebounceMap?: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
  onUpdateNote?: (noteId: string, content: string) => void;
  onDeleteNote?: (noteId: string) => void;
  onToggleChecklistItem?: (noteId: string, itemId: string) => void;
  onEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  onDeleteChecklistItem?: (noteId: string, itemId: string) => void;
  onSplitChecklistItem?: (noteId: string, itemId: string, content: string, cursorPosition: number) => void;
  onAddChecklistItem?: (noteId: string) => void;
  onToggleAllChecklistItems?: (noteId: string) => void;
  debouncedEditChecklistItem?: (noteId: string, itemId: string, content: string) => void;
  getResponsiveConfig?: () => { notePadding: number };
  className?: string;
}

export function NoteComponent({
  note,
  user,
  boardId,
  editingNote,
  editContent,
  setEditingNote,
  setEditContent,
  editingChecklistItem,
  editingChecklistItemContent,
  setEditingChecklistItem,
  setEditingChecklistItemContent,
  addingChecklistItem,
  newChecklistItemContent,
  setAddingChecklistItem,
  setNewChecklistItemContent,
  animatingItems,
  editDebounceMap,
  onUpdateNote,
  onDeleteNote,
  onToggleChecklistItem,
  onEditChecklistItem,
  onDeleteChecklistItem,
  onSplitChecklistItem,
  onAddChecklistItem,
  onToggleAllChecklistItems,
  debouncedEditChecklistItem,
  getResponsiveConfig,
  className,
}: NoteProps) {
  return (
    <div
      data-testid={`note-${note.id}`}
      className={cn(
        "absolute rounded-lg shadow-lg select-none group transition-all duration-200 flex flex-col border border-gray-200 dark:border-gray-600 box-border note-background",
        note.done ? "opacity-80" : "",
        className
      )}
      style={{
        backgroundColor:
          typeof window !== "undefined" &&
          window.matchMedia &&
          window.matchMedia("(prefers-color-scheme: dark)").matches
            ? `${note.color}20`
            : note.color,
        left: note.x,
        top: note.y,
        width: note.width,
        height: note.height,
        padding: `${getResponsiveConfig?.().notePadding || 16}px`,
      }}
    >
      <div className="flex items-start justify-between mb-4 flex-shrink-0">
        <div className="flex items-center space-x-2">
          <Avatar className="h-7 w-7 border-2 border-white dark:border-zinc-800">
            <AvatarFallback className="bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-sm font-semibold">
              {note.user.name
                ? note.user.name.charAt(0).toUpperCase()
                : note.user.email.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate max-w-20">
              {note.user.name
                ? note.user.name.split(" ")[0]
                : note.user.email.split("@")[0]}
            </span>
            <div className="flex flex-col">
              {boardId === "all-notes" && note.board && (
                <span className="text-xs text-blue-600 dark:text-blue-400 opacity-80 font-medium truncate max-w-20">
                  {note.board.name}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {(user?.id === note.user.id || user?.isAdmin) && (
            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDeleteNote?.(note.id);
                }}
                className="p-1 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}
          {(user?.id === note.user.id || user?.isAdmin) && (
            <div className="flex items-center">
              <Checkbox
                checked={note.done}
                onCheckedChange={() => {
                  onToggleAllChecklistItems?.(note.id);
                }}
                className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                title={
                  note.done
                    ? "Uncheck all items"
                    : "Check all items"
                }
              />
            </div>
          )}
        </div>
      </div>

      {editingNote === note.id ? (
        <div className="flex-1 min-h-0">
          <textarea
            value={editContent}
            onChange={(e) => {
              const newValue = e.target.value;
              setEditContent?.(newValue);
            }}
            className="w-full h-full p-2 bg-transparent border-none resize-none focus:outline-none text-base leading-7 text-gray-800 dark:text-gray-200"
            placeholder="Enter note content..."
            onBlur={() => onUpdateNote?.(note.id, editContent || "")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && e.ctrlKey) {
                onUpdateNote?.(note.id, editContent || "");
              }
              if (e.key === "Escape") {
                setEditingNote?.(null);
                setEditContent?.("");
              }
              if (e.key === "Backspace" && (editContent?.trim() === "" || !editContent)) {
                onDeleteNote?.(note.id);
              }
            }}
            onFocus={(e) => {
              const length = e.target.value.length;
              e.target.setSelectionRange(length, length);
            }}
            autoFocus
          />
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="overflow-y-auto space-y-1 flex-1">
            {note.checklistItems?.map((item) => (
              <ChecklistItemComponent
                key={item.id}
                item={item}
                onToggle={() => onToggleChecklistItem?.(note.id, item.id)}
                onEdit={(itemId, content) => onEditChecklistItem?.(note.id, itemId, content)}
                onDelete={(itemId) => onDeleteChecklistItem?.(note.id, itemId)}
                onSplit={(itemId, content, cursorPosition) => 
                  onSplitChecklistItem?.(note.id, itemId, content, cursorPosition)
                }
                isEditing={
                  editingChecklistItem?.noteId === note.id &&
                  editingChecklistItem?.itemId === item.id
                }
                editContent={editingChecklistItemContent}
                onEditContentChange={setEditingChecklistItemContent}
                onStartEdit={(itemId) => {
                  if (user?.id === note.user.id || user?.isAdmin) {
                    setEditingChecklistItem?.({
                      noteId: note.id,
                      itemId,
                    });
                    setEditingChecklistItemContent?.(item.content);
                  }
                }}
                onStopEdit={() => {
                  setEditingChecklistItem?.(null);
                  setEditingChecklistItemContent?.("");
                }}
                readonly={!(user?.id === note.user.id || user?.isAdmin)}
                showDeleteButton={user?.id === note.user.id || user?.isAdmin}
                animating={animatingItems?.has(item.id)}
                editDebounceMap={editDebounceMap}
                debouncedEdit={(itemId: string, content: string) => debouncedEditChecklistItem?.(note.id, itemId, content)}
              />
            ))}

            {addingChecklistItem === note.id && (
              <div className="flex items-center group/item rounded gap-3 transition-all duration-200">
                <Checkbox
                  checked={false}
                  disabled
                  className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
                />
                <Input
                  type="text"
                  value={newChecklistItemContent}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setNewChecklistItemContent?.(e.target.value)
                  }
                  className="flex-1 bg-transparent border-none text-sm leading-6 text-gray-800 dark:text-gray-200 placeholder-gray-500 dark:placeholder-gray-400 focus-visible:ring-0 focus-visible:ring-offset-0"
                  placeholder="Add new item..."
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === "Enter") {
                      onAddChecklistItem?.(note.id);
                    }
                    if (e.key === "Escape") {
                      setAddingChecklistItem?.(null);
                      setNewChecklistItemContent?.("");
                    }
                    if (
                      e.key === "Backspace" &&
                      (newChecklistItemContent?.trim() === "" || !newChecklistItemContent)
                    ) {
                      setAddingChecklistItem?.(null);
                      setNewChecklistItemContent?.("");
                    }
                  }}
                  onBlur={() => {
                    if (newChecklistItemContent?.trim()) {
                      onAddChecklistItem?.(note.id);
                    }
                  }}
                  autoFocus
                />
              </div>
            )}
          </div>

          {(user?.id === note.user.id || user?.isAdmin) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e: React.MouseEvent) => {
                e.stopPropagation();
                setAddingChecklistItem?.(note.id);
              }}
              className="mt-2 justify-start text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-gray-100 text-sm opacity-70 hover:opacity-100"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add task
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
