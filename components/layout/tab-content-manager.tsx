"use client"

import { useTabs, useActiveTabId } from "@/stores"
import { NoteEditor } from "@/features/notes/components"
import { NoteList } from "@/features/notes"

export function TabContentManager() {
  const tabs = useTabs()
  const activeTabId = useActiveTabId()

  // Show note list when no tabs are open
  if (tabs.length === 0) {
    return <NoteList />
  }

  return (
    <>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={tab.id === activeTabId ? "h-full" : "hidden"}
        >
          <NoteEditor noteId={tab.noteId} tabId={tab.id} />
        </div>
      ))}
    </>
  )
}
