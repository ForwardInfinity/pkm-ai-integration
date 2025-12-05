"use client"

import { LogOut, Settings, User } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface UserNavProps {
  email?: string
  isCollapsed?: boolean
}

export function UserNav({ email, isCollapsed = false }: UserNavProps) {
  const router = useRouter()

  const handleLogout = async () => {
    // Create client inside handler, not at render time (fixes anti-pattern)
    const supabase = createClient()
    await supabase.auth.signOut()
    router.refresh()
    router.push("/login")
  }

  const triggerButton = (
    <Button
      variant="ghost"
      className={cn(
        "justify-start h-12",
        isCollapsed ? "w-10 h-10 p-0 justify-center" : "w-full px-2"
      )}
      aria-label={`User menu for ${email || "User"}`}
    >
      <div
        className={cn(
          "flex items-center w-full",
          isCollapsed ? "justify-center" : "gap-2"
        )}
      >
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <User className="h-4 w-4" aria-hidden="true" />
        </div>
        {!isCollapsed && (
          <div className="flex flex-col items-start text-sm truncate">
            <span className="font-medium truncate w-32 text-left">
              {email || "User"}
            </span>
          </div>
        )}
      </div>
    </Button>
  )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        {isCollapsed ? (
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>{triggerButton}</TooltipTrigger>
              <TooltipContent side="right">{email || "User menu"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ) : (
          triggerButton
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="start" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Account</p>
            <p className="text-xs leading-none text-muted-foreground">
              {email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem>
            <Settings className="mr-2 h-4 w-4" aria-hidden="true" />
            <span>Settings</span>
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" aria-hidden="true" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
