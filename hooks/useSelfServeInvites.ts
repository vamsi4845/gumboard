"use client";

import { useQuery } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";

export type SelfServeInvite = {
  id: string;
  token: string;
  name: string;
  createdAt: string;
  expiresAt: string | null;
  usageLimit: number | null;
  usageCount: number;
  user: { name: string | null; email: string };
};

export function useSelfServeInvites() {
  return useQuery<{ selfServeInvites: SelfServeInvite[] }>({
    queryKey: ["organization", "self-serve-invites"],
    queryFn: ({ signal }) => jfetch(`/api/organization/self-serve-invites`, { signal }),
    staleTime: 5 * 60 * 1000, // 5 minutes - self-serve invites rarely change
    gcTime: 10 * 60 * 1000, // 10 minutes in cache
    refetchOnWindowFocus: false,
    // Lowest priority - background loading only
    retry: 1,
    retryDelay: 3000,
  });
}


