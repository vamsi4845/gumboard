"use client";

import { useQuery } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";

export type OrganizationInvite = {
  id: string;
  email: string;
  status: string;
  createdAt: string;
};

export function useOrganizationInvites() {
  return useQuery<{ invites: OrganizationInvite[] }>({
    queryKey: ["organization", "invites"],
    queryFn: ({ signal }) => jfetch(`/api/organization/invites`, { signal }),
    staleTime: 2 * 60 * 1000, // 2 minutes - invites change more frequently
    gcTime: 5 * 60 * 1000, // 5 minutes in cache
    refetchOnWindowFocus: false,
    // Lower priority - doesn't block form interaction
    retry: 1,
    retryDelay: 2000,
  });
}


