"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Plus, PanelLeftClose, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button, buttonVariants } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { sidebarNavigation } from "@/config/navigation"
import { Logo } from "@/components/shared/logo"
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button"
import { UserNav } from "@/components/layout/user-nav"
import { SidebarNoteList } from "@/components/layout/sidebar-note-list"
import { LAYOUT_CONSTANTS } from "@/types/layout.types"

interface AppSidebarProps {
  isCollapsed: boolean
  email?: string
  onToggle?: () => void
}

export function AppSidebar({ isCollapsed, email, onToggle }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleNewNote = () => {
    router.push("/notes/new")
  }

  return (
    <div
      data-collapsed={isCollapsed}
      className="group relative flex flex-col gap-4 py-4 h-full bg-muted/10"
      role="navigation"
      aria-label="Main navigation"
      id="app-sidebar"
    >
      {/* Header with Logo */}
      <div
        className={cn(
          "flex items-center px-4",
          isCollapsed ? "justify-center px-2" : "justify-start"
        )}
        style={{ height: LAYOUT_CONSTANTS.HEADER_HEIGHT }}
      >
        <Logo
          className={cn(
            "transition-all duration-200",
            isCollapsed && "scale-0 w-0 h-0 overflow-hidden"
          )}
        />
        {isCollapsed && <Logo iconOnly className="h-6 w-6" />}
      </div>

      <Separator />

      {/* New Note Button */}
      <div className={cn("px-4", isCollapsed && "px-2")}>
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={isCollapsed ? "ghost" : "default"}
                size={isCollapsed ? "icon" : "default"}
                onClick={handleNewNote}
                aria-label="Create new note"
                className={cn(
                  "w-full",
                  isCollapsed
                    ? "h-10 w-10 justify-center hover:bg-muted/50"
                    : "justify-start"
                )}
              >
                <Plus
                  className={cn("h-4 w-4", !isCollapsed && "mr-2")}
                  aria-hidden="true"
                />
                {!isCollapsed && "New Note"}
              </Button>
            </TooltipTrigger>
            {isCollapsed && (
              <TooltipContent side="right">New Note</TooltipContent>
            )}
          </Tooltip>
        </TooltipProvider>
      </div>

      {/* Navigation Links */}
      <ScrollArea className="flex-1 px-2">
        <nav
          className={cn(
            "grid px-2",
            isCollapsed ? "justify-center gap-2 px-0" : "gap-1"
          )}
          aria-label="Sidebar navigation"
        >
          {/* Collapsible Notes Section - only when expanded */}
          {!isCollapsed && <SidebarNoteList />}

          {/* Notes icon when collapsed */}
          {isCollapsed && (
            <TooltipProvider delayDuration={0}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href="/notes"
                    className={cn(
                      buttonVariants({
                        variant: pathname.startsWith("/notes") ? "secondary" : "ghost",
                        size: "icon",
                      }),
                      "h-10 w-10 hover:bg-muted/50",
                      pathname.startsWith("/notes") && "font-medium"
                    )}
                    aria-current={pathname.startsWith("/notes") ? "page" : undefined}
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only">Notes</span>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">Notes</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}

          {/* Other navigation links (excluding Notes) */}
          {sidebarNavigation
            .filter((link) => link.href !== "/notes")
            .map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(`${link.href}/`)

              return isCollapsed ? (
                <TooltipProvider key={link.href} delayDuration={0}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Link
                        href={link.href}
                        className={cn(
                          buttonVariants({
                            variant: isActive ? "secondary" : "ghost",
                            size: "icon",
                          }),
                          "h-10 w-10 hover:bg-muted/50",
                          isActive && "font-medium"
                        )}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <link.icon className="h-4 w-4" aria-hidden="true" />
                        <span className="sr-only">{link.title}</span>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="flex items-center gap-4">
                      {link.title}
                      {link.badge && (
                        <span className="ml-auto text-muted-foreground">0</span>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    buttonVariants({
                      variant: isActive ? "secondary" : "ghost",
                      size: "sm",
                    }),
                    "justify-start",
                    isActive && "font-medium"
                  )}
                  aria-current={isActive ? "page" : undefined}
                >
                  <link.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                  {link.title}
                  {link.badge && (
                    <span
                      className={cn(
                        "ml-auto text-xs",
                        isActive
                          ? "text-secondary-foreground"
                          : "text-muted-foreground"
                      )}
                    >
                      0
                    </span>
                  )}
                </Link>
              )
            })}
        </nav>
      </ScrollArea>

      {/* User Navigation */}
      <div className={cn("mt-auto", isCollapsed ? "px-2 flex justify-center" : "px-2")}>
        <UserNav email={email} isCollapsed={isCollapsed} />
      </div>

      {/* Collapse Button - only show when expanded */}
      {onToggle && !isCollapsed && (
        <div className="absolute bottom-2 right-2">
          <TooltipIconButton
            icon={<PanelLeftClose className="h-4 w-4" />}
            tooltip="Collapse sidebar"
            tooltipSide="right"
            onClick={onToggle}
            aria-label="Collapse sidebar"
            aria-expanded={!isCollapsed}
            aria-controls="app-sidebar"
          />
        </div>
      )}
    </div>
  )
}
