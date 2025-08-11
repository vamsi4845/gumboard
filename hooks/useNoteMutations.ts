"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";
import { nanoid } from "nanoid";

type OptimisticNotes = {
  pages: { notes: any[]; nextCursor?: string | null }[];
  pageParams: unknown[];
};

export function useNoteMutations(boardId: string) {
  const qc = useQueryClient();

  const createNote = useMutation({
    mutationFn: async (title: string) =>
      jfetch(`/api/notes`, {
        method: "POST",
        body: JSON.stringify({ boardId, title }),
      }),
    onMutate: async (title: string) => {
      await qc.cancelQueries({ queryKey: ["notes", boardId] });
      const previous = qc.getQueryData<OptimisticNotes>(["notes", boardId]);

      const tempId = `temp-${nanoid(6)}`;
      qc.setQueryData<OptimisticNotes>(["notes", boardId], (old) => {
        if (!old) return old as unknown as OptimisticNotes;
        const first = old.pages[0];
        const optimistic = {
          id: tempId,
          content: title,
          color: "#fef3c7",
          done: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          user: { id: "me", name: null, email: "" },
          boardId,
        };
        return {
          ...old,
          pages: [{ ...first, notes: [optimistic, ...first.notes] }, ...old.pages.slice(1)],
        };
      });

      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notes", boardId], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notes", boardId] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  const updateNote = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      jfetch(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onMutate: async ({ id, data }) => {
      await qc.cancelQueries({ queryKey: ["notes", boardId] });
      const previous = qc.getQueryData<OptimisticNotes>(["notes", boardId]);
      qc.setQueryData<OptimisticNotes>(["notes", boardId], (old) => {
        if (!old) return old as unknown as OptimisticNotes;
        return {
          ...old,
          pages: old.pages.map((p) => ({
            ...p,
            notes: p.notes.map((n) => (n.id === id ? { ...n, ...data } : n)),
          })),
        };
      });
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notes", boardId], ctx.previous);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notes", boardId] }),
  });

  const archiveNote = useMutation({
    mutationFn: (id: string) =>
      jfetch(`/api/notes/${id}`, { method: "PATCH", body: JSON.stringify({ archived: true }) }),
    onMutate: async (id: string) => {
      await qc.cancelQueries({ queryKey: ["notes", boardId] });
      const previous = qc.getQueryData<OptimisticNotes>(["notes", boardId]);
      qc.setQueryData<OptimisticNotes>(["notes", boardId], (old) => {
        if (!old) return old as unknown as OptimisticNotes;
        return {
          ...old,
          pages: old.pages.map((p) => ({ ...p, notes: p.notes.filter((n) => n.id !== id) })),
        };
      });
      return { previous };
    },
    onError: (_e, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["notes", boardId], ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["notes", boardId] });
      qc.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  return { createNote, updateNote, archiveNote };
}


