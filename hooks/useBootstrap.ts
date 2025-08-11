"use client";

import { useQuery } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";

export type BootstrapBoard = {
  id: string;
  name: string;
  description?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  isPublic: boolean;
  _count: { notes: number };
};

export type BootstrapUser = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  organizationId: string | null;
};

export type Bootstrap = {
  user: BootstrapUser | null;
  boards: BootstrapBoard[];
};

export function useBootstrap() {
  return useQuery<Bootstrap>({
    queryKey: ["bootstrap"],
    queryFn: ({ signal }) => jfetch<Bootstrap>("/api/bootstrap", { signal }),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}


