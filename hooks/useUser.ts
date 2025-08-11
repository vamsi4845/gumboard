"use client";

import { useQuery } from "@tanstack/react-query";
import { jfetch } from "@/lib/fetcher";

export type UserResponse = {
  id: string;
  name: string | null;
  email: string;
  isAdmin: boolean;
  organization: {
    id: string;
    name: string;
    slackWebhookUrl?: string | null;
    members: { id: string; name: string | null; email: string; isAdmin: boolean }[];
  } | null;
};

export function useUser() {
  return useQuery<UserResponse>({
    queryKey: ["user"],
    queryFn: ({ signal }) => jfetch<UserResponse>("/api/user", { signal }),
    staleTime: 5 * 60 * 1000, // 5 minutes - profile data is stable
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchOnWindowFocus: false,
    // High priority - this should load first
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
  });
}


