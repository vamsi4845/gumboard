"use client";

import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Trash2 } from "lucide-react";

export interface ChecklistItem {
  id: string;
  content: string;
  checked: boolean;
  order: number;
}

interface ChecklistItemProps {
  item: ChecklistItem;
  onToggle?: (itemId: string) => void;
  onEdit?: (itemId: string, content: string) => void;
  onDelete?: (itemId: string) => void;
  onSplit?: (itemId: string, content: string, cursorPosition: number) => void;
  isEditing?: boolean;
  editContent?: string;
  onEditContentChange?: (content: string) => void;
  onStartEdit?: (itemId: string) => void;
  onStopEdit?: () => void;
  readonly?: boolean;
  showDeleteButton?: boolean;
  className?: string;
  animating?: boolean;
  editDebounceMap?: React.MutableRefObject<Map<string, NodeJS.Timeout>>;
  debouncedEdit?: (itemId: string, content: string) => void;
}

export function ChecklistItemComponent({
  item,
  onToggle,
  onEdit,
  onDelete,
  onSplit,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onStopEdit,
  readonly = false,
  showDeleteButton = true,
  className,
  animating = false,
  editDebounceMap,
  debouncedEdit,
}: ChecklistItemProps) {
  return (
    <div
      className={cn(
        "flex items-center group/item rounded gap-3 transition-all duration-200",
        animating ? "animate-pulse" : "",
        className
      )}
    >
      <Checkbox
        checked={item.checked}
        onCheckedChange={() => onToggle?.(item.id)}
        className="border-slate-500 bg-white/50 dark:bg-zinc-800 dark:border-zinc-600"
      />

      {isEditing ? (
        <Input
          type="text"
          value={editContent}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            onEditContentChange?.(e.target.value);
            debouncedEdit?.(item.id, e.target.value);
          }}
          className={cn(
            "h-auto flex-1 border-none bg-transparent p-0 text-sm text-zinc-900 dark:text-zinc-100 focus-visible:ring-0 focus-visible:ring-offset-0",
            item.checked &&
              "text-slate-500 dark:text-zinc-500 line-through"
          )}
          onBlur={() => {
            if (editDebounceMap) {
              const key = item.id;
              const existingTimeout = editDebounceMap.current.get(key);
              if (existingTimeout) {
                clearTimeout(existingTimeout);
                editDebounceMap.current.delete(key);
              }
            }
            onEdit?.(item.id, editContent || "");
          }}
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === "Enter") {
              e.preventDefault();
              const target = e.target as HTMLInputElement;
              const cursorPosition = target.selectionStart || 0;
              onSplit?.(item.id, editContent || "", cursorPosition);
            }
            if (e.key === "Escape") {
              onStopEdit?.();
            }
            if (e.key === "Backspace" && (editContent?.trim() === "" || !editContent)) {
              e.preventDefault();
              onDelete?.(item.id);
            }
          }}
          autoFocus
        />
      ) : (
        <span
          className={cn(
            "flex-1 text-sm leading-6 cursor-pointer transition-all duration-200",
            item.checked
              ? "text-slate-500 dark:text-zinc-500 line-through"
              : "text-gray-800 dark:text-gray-200"
          )}
          onClick={() => {
            if (!readonly) {
              onStartEdit?.(item.id);
            }
          }}
        >
          {item.content}
        </span>
      )}

      {showDeleteButton && !readonly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-50 hover:opacity-100 text-zinc-500 hover:text-red-600 dark:text-zinc-400 dark:hover:text-red-500"
          onClick={() => onDelete?.(item.id)}
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      )}
    </div>
  );
}
