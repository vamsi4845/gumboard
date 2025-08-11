"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";

export type NoteListItem = {
  id: string;
  content: string;
  color: string;
  done: boolean;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string | null; email: string };
  boardId: string;
};

export type NotesPage = { notes: NoteListItem[]; nextCursor: string | null };

export function useNotes(boardId: string, take: number = 50) {
  return useInfiniteQuery<NotesPage>({
    queryKey: ["notes", boardId, take],
    queryFn: ({ pageParam, signal }) =>
      jfetch<NotesPage>(
        `/api/boards/${boardId}/notes${pageParam ? `?cursor=${pageParam}&take=${take}` : `?take=${take}`}`,
        { signal }
      ),
    getNextPageParam: (last) => last.nextCursor,
    staleTime: 20_000, // Show cached data for 20 seconds
    gcTime: 5 * 60 * 1000, // Keep in cache for 5 minutes
    refetchOnWindowFocus: false,
    refetchOnMount: "always", // Always check for fresh data but show cached immediately
    enabled: !!boardId, // Only fetch when boardId exists
    initialPageParam: undefined as unknown as string | undefined,
  });
}


