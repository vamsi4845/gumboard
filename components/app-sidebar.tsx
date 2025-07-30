"use client"

import { Home, Settings, Plus, LogOut } from "lucide-react"
import Link from "next/link"
import { signOut, useSession } from "next-auth/react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"

const menuItems = [
  {
    title: "Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "Settings",
    url: "/settings",
    icon: Settings,
  },
]

export function AppSidebar() {
  const { data: session } = useSession()

  const handleSignOut = () => {
    signOut({ callbackUrl: "/" })
  }

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-2">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">G</span>
            </div>
            <span className="font-semibold text-lg">Gumboard</span>
          </Link>
        </div>
        <div className="p-2">
          <Button 
            onClick={() => {
              const event = new CustomEvent('openAddBoard');
              window.dispatchEvent(event);
            }}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add board
          </Button>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <Link href={item.url}>
                      <item.icon className="w-4 h-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-sidebar-border">
        <div className="p-2 space-y-1">
          <SidebarMenuButton asChild>
            <Link href="/settings" className="w-full justify-start">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
          </SidebarMenuButton>
          <SidebarMenuButton onClick={handleSignOut} className="w-full justify-start">
            <LogOut className="w-4 h-4" />
            <span>Sign out</span>
          </SidebarMenuButton>
          <div className="px-2 py-1 text-xs text-muted-foreground truncate">
            {session?.user?.name || session?.user?.email || "User"}
          </div>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
