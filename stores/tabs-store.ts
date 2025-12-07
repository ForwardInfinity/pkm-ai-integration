"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import { useShallow } from "zustand/react/shallow"
import { nanoid } from "nanoid"

const MAX_TABS = 15
const STORAGE_KEY = "refinery-tabs"

export interface Tab {
  id: string
  noteId: string
  title: string
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string | null
  showListView: boolean
}

interface TabsActions {
  openTab: (noteId: string, title?: string, activate?: boolean) => string
  closeTab: (tabId: string) => void
  activateTab: (tabId: string) => void
  updateTabTitle: (tabId: string, title: string) => void
  updateTabNoteId: (tabId: string, noteId: string) => void
  reorderTabs: (fromIndex: number, toIndex: number) => void
  getTabByNoteId: (noteId: string) => Tab | undefined
  setShowListView: (show: boolean) => void
  reset: () => void
}

type TabsStore = TabsState & TabsActions

const initialState: TabsState = {
  tabs: [],
  activeTabId: null,
  showListView: false,
}

export const useTabsStore = create<TabsStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      openTab: (noteId: string, title?: string, activate = true) => {
        const state = get()
        
        // Check if tab already exists for this note
        const existingTab = state.tabs.find((t) => t.noteId === noteId)
        if (existingTab) {
          if (activate) {
            set({ activeTabId: existingTab.id, showListView: false })
          }
          return existingTab.id
        }

        // Create new tab
        const newTab: Tab = {
          id: nanoid(),
          noteId,
          title: title || (noteId === "new" ? "New Note" : "Untitled"),
        }

        // Enforce max tabs limit
        let newTabs = [...state.tabs, newTab]
        if (newTabs.length > MAX_TABS) {
          // Remove oldest non-active tab
          const tabToRemove = newTabs.find((t) => t.id !== state.activeTabId)
          if (tabToRemove) {
            newTabs = newTabs.filter((t) => t.id !== tabToRemove.id)
          }
        }

        set({
          tabs: newTabs,
          activeTabId: activate ? newTab.id : state.activeTabId,
          showListView: activate ? false : state.showListView,
        })

        return newTab.id
      },

      closeTab: (tabId: string) => {
        const state = get()
        const tabIndex = state.tabs.findIndex((t) => t.id === tabId)
        if (tabIndex === -1) return

        const newTabs = state.tabs.filter((t) => t.id !== tabId)
        let newActiveTabId = state.activeTabId

        // If closing active tab, activate adjacent tab
        if (state.activeTabId === tabId) {
          if (newTabs.length === 0) {
            newActiveTabId = null
          } else if (tabIndex >= newTabs.length) {
            newActiveTabId = newTabs[newTabs.length - 1].id
          } else {
            newActiveTabId = newTabs[tabIndex].id
          }
        }

        set({
          tabs: newTabs,
          activeTabId: newActiveTabId,
        })
      },

      activateTab: (tabId: string) => {
        const state = get()
        const tab = state.tabs.find((t) => t.id === tabId)
        if (tab) {
          set({ activeTabId: tabId, showListView: false })
        }
      },

      updateTabTitle: (tabId: string, title: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, title: title || "Untitled" } : t
          ),
        }))
      },

      updateTabNoteId: (tabId: string, noteId: string) => {
        set((state) => ({
          tabs: state.tabs.map((t) =>
            t.id === tabId ? { ...t, noteId } : t
          ),
        }))
      },

      reorderTabs: (fromIndex: number, toIndex: number) => {
        set((state) => {
          if (
            fromIndex < 0 || fromIndex >= state.tabs.length ||
            toIndex < 0 || toIndex > state.tabs.length
          ) {
            return state
          }
          const newTabs = [...state.tabs]
          const [movedTab] = newTabs.splice(fromIndex, 1)
          newTabs.splice(toIndex, 0, movedTab)
          return { tabs: newTabs }
        })
      },

      getTabByNoteId: (noteId: string) => {
        return get().tabs.find((t) => t.noteId === noteId)
      },

      setShowListView: (show: boolean) => {
        set({ showListView: show })
      },

      reset: () => set(initialState),
    }),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        tabs: state.tabs,
        activeTabId: state.activeTabId,
      }),
    }
  )
)

// Selector hooks
export const useTabs = () => useTabsStore((state) => state.tabs)
export const useActiveTabId = () => useTabsStore((state) => state.activeTabId)
export const useShowListView = () => useTabsStore((state) => state.showListView)
export const useActiveTab = () =>
  useTabsStore((state) => state.tabs.find((t) => t.id === state.activeTabId))

export const useTabsActions = () =>
  useTabsStore(
    useShallow((state) => ({
      openTab: state.openTab,
      closeTab: state.closeTab,
      activateTab: state.activateTab,
      updateTabTitle: state.updateTabTitle,
      updateTabNoteId: state.updateTabNoteId,
      reorderTabs: state.reorderTabs,
      getTabByNoteId: state.getTabByNoteId,
      setShowListView: state.setShowListView,
      reset: state.reset,
    }))
  )
