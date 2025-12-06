"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { ChevronRight, FileText, Loader2 } from "lucide-react"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { useNotes } from "@/features/notes"
import { useTabsActions } from "@/stores"

const STORAGE_KEY = "sidebar-notes-expanded"
const MAX_VISIBLE_NOTES = 5

export function SidebarNoteList() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: notes, isLoading } = useNotes()
  const { openTab, setShowListView } = useTabsActions()
  const [isOpen, setIsOpen] = useState(true)

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

  const isNotesActive = pathname === "/notes" || pathname.startsWith("/notes/")
  const recentNotes = notes?.slice(0, MAX_VISIBLE_NOTES) ?? []

  return (
    <Collapsible open={isOpen} onOpenChange={handleOpenChange}>
      <CollapsibleTrigger
        className={cn(
          buttonVariants({ variant: isNotesActive ? "secondary" : "ghost", size: "sm" }),
          "w-full justify-start group"
        )}
      >
        <ChevronRight
          className={cn(
            "mr-2 h-4 w-4 shrink-0 transition-transform duration-200",
            isOpen && "rotate-90"
          )}
        />
        <FileText className="mr-2 h-4 w-4 shrink-0" />
        <span className={cn(isNotesActive && "font-medium")}>Notes</span>
      </CollapsibleTrigger>

      <CollapsibleContent className="pl-4 pt-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-2">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : recentNotes.length === 0 ? (
          <Link
            href="/notes/new"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "w-full justify-start text-muted-foreground text-xs"
            )}
          >
            No notes yet
          </Link>
        ) : (
          <div className="flex flex-col gap-0.5">
            {recentNotes.map((note) => {
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
            <button
              type="button"
              onClick={() => {
                setShowListView(true)
                router.push("/notes")
              }}
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "w-full justify-start h-8 px-2 text-muted-foreground text-xs"
              )}
            >
              See All
            </button>
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}
