"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail } from "lucide-react";


export default function ProfileSettingsPage() {
  const { data: userData, isLoading, isPending } = useUser();
  const qc = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [profileName, setProfileName] = useState("");
  const router = useRouter();

  // Update profile name immediately when user data becomes available
  useEffect(() => {
    if (userData?.name !== undefined) {
      setProfileName(userData.name || "");
    }
  }, [userData?.name]);

  // After profile data is fully loaded, prefetch organization data in background
  useEffect(() => {
    if (userData && !isLoading) {
      // Priority 1: Profile data is loaded and cached
      // Priority 2: Start prefetching organization data for instant navigation
      setTimeout(() => {
        qc.prefetchQuery({ 
          queryKey: ["organization", "invites"], 
          queryFn: () => fetch("/api/organization/invites").then(r => r.json()), 
          staleTime: 60_000 
        });
        qc.prefetchQuery({ 
          queryKey: ["organization", "self-serve-invites"], 
          queryFn: () => fetch("/api/organization/self-serve-invites").then(r => r.json()), 
          staleTime: 60_000 
        });
      }, 100); // Small delay to prioritize profile UI updates first
    }
  }, [userData, isLoading, qc]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isLoading && !userData) {
      router.push("/auth/signin");
    }
  }, [isLoading, userData, router]);

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: profileName,
        }),
      });

      if (response.ok) {
        const updatedUser = await response.json();
        setProfileName((updatedUser.name || "").trim());
        // Invalidate user cache to update everywhere
        qc.invalidateQueries({ queryKey: ["user"] });
      }
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6 bg-white dark:bg-black border border-border dark:border-zinc-800">
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-foreground dark:text-zinc-100 mb-2">
            Profile Settings
          </h2>
          <p className="text-muted-foreground dark:text-zinc-400">
            Manage your personal information and preferences.
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-foreground dark:text-zinc-200">Full Name</Label>
            <Input
              id="name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder={isPending ? "Loading profile..." : "Enter your full name"}
              disabled={isPending}
              className="mt-1 bg-white dark:bg-zinc-900 text-foreground dark:text-zinc-100"
            />
          </div>

          <div>
            <Label htmlFor="email" className="text-foreground dark:text-zinc-200">Email Address</Label>
            <div className="relative mt-1">
              <Input
                id="email"
                type="email"
                value={userData?.email || ""}
                disabled
                placeholder={isPending ? "Loading email..." : ""}
                className="bg-muted dark:bg-zinc-800 text-muted-foreground dark:text-zinc-400 cursor-not-allowed"
              />
              <Mail className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground dark:text-zinc-400" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-border dark:border-zinc-800">
          <Button
            onClick={handleSaveProfile}
            disabled={
              saving ||
              isPending ||
              profileName.trim().length === 0 ||
              profileName.trim() === (userData?.name || "").trim()
            }
            className="bg-black hover:bg-zinc-900 text-white dark:bg-zinc-900 dark:hover:bg-zinc-800"
          >
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </Card>
  );
}
