"use client"

import { useState, useEffect, useMemo } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, Pin, FileText } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useNotes } from "@/features/notes"
import { useTabsActions } from "@/stores"

const STORAGE_KEY = "sidebar-pinned-expanded"

interface SidebarPinnedNotesProps {
  isCollapsed?: boolean
}

export function SidebarPinnedNotes({ isCollapsed = false }: SidebarPinnedNotesProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { data: notes } = useNotes()
  const { openTab } = useTabsActions()
  const [isOpen, setIsOpen] = useState(true)

  const pinnedNotes = useMemo(() => {
    return notes?.filter((note) => note.is_pinned) ?? []
  }, [notes])

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored !== null) {
      setIsOpen(stored === "true")
    }
  }, [])

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    localStorage.setItem(STORAGE_KEY, String(open))
  }

  // Collapsed view - just show icon with tooltip
  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              href="/notes"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "h-10 w-10 hover:bg-muted/50"
              )}
            >
              <Pin className="h-4 w-4 text-muted-foreground" />
              <span className="sr-only">Pinned notes</span>
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            {pinnedNotes.length === 0 ? "No pinned notes" : `${pinnedNotes.length} Pinned`}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ variant: "ghost", size: "sm" }),
          "w-full justify-start group"
        )}
      >
        <ChevronRight
          className={cn(
            "mr-2 h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
        <Pin className="mr-2 h-4 w-4 shrink-0" />
        <span>Pinned</span>
        <span className="ml-auto text-xs text-muted-foreground">
          {pinnedNotes.length}
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-4 pt-1">
        {pinnedNotes.length === 0 ? (
          <span
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-start text-muted-foreground text-xs pointer-events-none"
            )}
          >
            No pinned notes
          </span>
        ) : (
          <div className="flex flex-col gap-0.5">
            {pinnedNotes.map((note) => {
              const isActive = pathname === `/notes/${note.id}`
              const handleClick = (e: React.MouseEvent) => {
                e.preventDefault()
                router.push(`/notes/${note.id}`)
              }
              const handleMiddleClick = (e: React.MouseEvent) => {
                if (e.button === 1) {
                  e.preventDefault()
                  openTab(note.id, note.title || "Untitled", false)
                }
              }
              return (
                <a
                  key={note.id}
                  href={`/notes/${note.id}`}
                  onClick={handleClick}
                  onMouseDown={handleMiddleClick}
                  className={cn(
                    buttonVariants({
                      variant: isActive ? "secondary" : "ghost",
                      size: "sm",
                    }),
                    "w-full justify-start h-8 px-2",
                    isActive && "font-medium"
                  )}
                >
                  <FileText className="mr-2 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  <span className="truncate text-sm">
                    {note.title || "Untitled"}
                  </span>
                </a>
              )
            })}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
