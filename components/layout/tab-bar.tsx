"use client"

import * as React from "react"
import { usePathname } from "next/navigation"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TabItem } from "@/components/layout/tab-item"
import {
  useTabs,
  useActiveTabId,
  useTabsActions,
} from "@/stores/tabs-store"

export function TabBar() {
  const pathname = usePathname()
  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = React.useState(false)
  const [canScrollRight, setCanScrollRight] = React.useState(false)

  const tabs = useTabs()
  const activeTabId = useActiveTabId()
  const { openTab, closeTab, activateTab, setShowListView } = useTabsActions()

  // Handle URL changes - URL is the single source of truth
  React.useEffect(() => {
    // Handle /notes route (list view)
    if (pathname === "/notes") {
      setShowListView(true)
      return
    }

    if (!pathname.startsWith("/notes/")) return

    const noteIdFromUrl = pathname.replace("/notes/", "")
    if (!noteIdFromUrl) return

    const existingTab = tabs.find((t) => t.noteId === noteIdFromUrl)
    if (existingTab) {
      if (existingTab.id !== activeTabId) {
        activateTab(existingTab.id)
      }
    } else {
      openTab(noteIdFromUrl, "Untitled", true)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Check scroll state
  const updateScrollState = React.useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 0)
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 1)
  }, [])

  React.useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    updateScrollState()
    el.addEventListener("scroll", updateScrollState)
    window.addEventListener("resize", updateScrollState)
    return () => {
      el.removeEventListener("scroll", updateScrollState)
      window.removeEventListener("resize", updateScrollState)
    }
  }, [updateScrollState, tabs])

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current
    if (!el) return
    const scrollAmount = 200
    el.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    })
  }

  const handleActivateTab = React.useCallback((tabId: string) => {
    const tab = tabs.find((t) => t.id === tabId)
    if (tab && tab.id !== activeTabId) {
      activateTab(tabId)
      // Update URL without navigation (for bookmarking/sharing)
      const path = tab.noteId === "new" ? "/notes/new" : `/notes/${tab.noteId}`
      window.history.replaceState(null, "", path)
    }
  }, [tabs, activeTabId, activateTab])

  const handleCloseTab = React.useCallback((tabId: string) => {
    const tabIndex = tabs.findIndex((t) => t.id === tabId)
    const isActive = tabId === activeTabId
    closeTab(tabId)

    if (isActive) {
      const remainingTabs = tabs.filter((t) => t.id !== tabId)
      if (remainingTabs.length === 0) {
        window.history.replaceState(null, "", "/notes")
      } else {
        const nextTab =
          remainingTabs[Math.min(tabIndex, remainingTabs.length - 1)]
        const path =
          nextTab.noteId === "new" ? "/notes/new" : `/notes/${nextTab.noteId}`
        window.history.replaceState(null, "", path)
      }
    }
  }, [tabs, activeTabId, closeTab])

  const handleNewTab = React.useCallback(() => {
    openTab("new", "New Note", true)
    window.history.replaceState(null, "", "/notes/new")
  }, [openTab])

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0
      const modKey = isMac ? e.metaKey : e.ctrlKey

      // Ctrl/Cmd + W: Close tab
      if (modKey && e.key === "w" && activeTabId) {
        e.preventDefault()
        handleCloseTab(activeTabId)
        return
      }

      // Ctrl/Cmd + T: New tab
      if (modKey && e.key === "t") {
        e.preventDefault()
        handleNewTab()
        return
      }

      // Ctrl + Tab / Ctrl + Shift + Tab: Switch tabs
      if (e.ctrlKey && e.key === "Tab") {
        e.preventDefault()
        const currentIndex = tabs.findIndex((t) => t.id === activeTabId)
        if (currentIndex === -1) return

        let nextIndex: number
        if (e.shiftKey) {
          nextIndex = currentIndex === 0 ? tabs.length - 1 : currentIndex - 1
        } else {
          nextIndex = currentIndex === tabs.length - 1 ? 0 : currentIndex + 1
        }

        handleActivateTab(tabs[nextIndex].id)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [activeTabId, tabs, handleActivateTab, handleCloseTab, handleNewTab])

  if (tabs.length === 0) {
    return null
  }

  return (
    <div className="flex h-9 items-center border-b bg-muted/20">
      {/* Scroll left button */}
      {canScrollLeft && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-6 shrink-0 rounded-none"
          onClick={() => scroll("left")}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      {/* Tabs container */}
      <div
        ref={scrollRef}
        className="flex flex-1 overflow-x-auto scrollbar-none"
        role="tablist"
      >
        {tabs.map((tab) => (
          <TabItem
            key={tab.id}
            title={tab.title}
            isActive={tab.id === activeTabId}
            onActivate={() => handleActivateTab(tab.id)}
            onClose={() => handleCloseTab(tab.id)}
            onMiddleClick={() => handleCloseTab(tab.id)}
          />
        ))}
      </div>

      {/* Scroll right button */}
      {canScrollRight && (
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-6 shrink-0 rounded-none"
          onClick={() => scroll("right")}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}

      {/* New tab button */}
      <Button
        variant="ghost"
        size="icon"
        className="h-9 w-9 shrink-0 rounded-none border-l"
        onClick={handleNewTab}
        aria-label="New tab"
      >
        <Plus className="h-4 w-4" />
      </Button>
    </div>
  )
}
