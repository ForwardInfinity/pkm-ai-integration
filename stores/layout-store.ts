"use client"

import { create } from "zustand"
import { persist, createJSONStorage } from "zustand/middleware"
import type { LayoutStore, LayoutSizes } from "@/types/layout.types"
import { LAYOUT_CONSTANTS, COOKIE_CONFIG } from "@/types/layout.types"

// Custom cookie storage for Zustand persist middleware
const cookieStorage = {
  getItem: (name: string): string | null => {
    if (typeof document === "undefined") return null
    const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`))
    return match ? decodeURIComponent(match[2]) : null
  },
  setItem: (name: string, value: string): void => {
    if (typeof document === "undefined") return
    const { path, maxAge, sameSite } = COOKIE_CONFIG.OPTIONS
    document.cookie = `${name}=${encodeURIComponent(value)}; path=${path}; max-age=${maxAge}; SameSite=${sameSite}`
  },
  removeItem: (name: string): void => {
    if (typeof document === "undefined") return
    document.cookie = `${name}=; path=/; max-age=0`
  },
}

// Default layout sizes
const defaultSizes: LayoutSizes = {
  sidebar: LAYOUT_CONSTANTS.DEFAULT_SIDEBAR_SIZE,
  main: LAYOUT_CONSTANTS.DEFAULT_MAIN_SIZE,
  inspector: LAYOUT_CONSTANTS.DEFAULT_INSPECTOR_SIZE,
}

export const useLayoutStore = create<LayoutStore>()(
  persist(
    (set) => ({
      // Initial state
      isSidebarCollapsed: false,
      isInspectorCollapsed: false,
      sizes: defaultSizes,

      // Actions
      toggleSidebar: () =>
        set((state) => ({ isSidebarCollapsed: !state.isSidebarCollapsed })),

      toggleInspector: () =>
        set((state) => ({ isInspectorCollapsed: !state.isInspectorCollapsed })),

      setSidebarCollapsed: (collapsed: boolean) =>
        set({ isSidebarCollapsed: collapsed }),

      setInspectorCollapsed: (collapsed: boolean) =>
        set({ isInspectorCollapsed: collapsed }),

      setSizes: (sizes: LayoutSizes) => set({ sizes }),
    }),
    {
      name: COOKIE_CONFIG.LAYOUT_KEY,
      storage: createJSONStorage(() => cookieStorage),
      partialize: (state) => ({
        isSidebarCollapsed: state.isSidebarCollapsed,
        isInspectorCollapsed: state.isInspectorCollapsed,
        sizes: state.sizes,
      }),
    }
  )
)

// Selector hooks for performance optimization
export const useSidebarCollapsed = () =>
  useLayoutStore((state) => state.isSidebarCollapsed)

export const useInspectorCollapsed = () =>
  useLayoutStore((state) => state.isInspectorCollapsed)

export const useLayoutSizes = () => useLayoutStore((state) => state.sizes)

export const useLayoutActions = () =>
  useLayoutStore((state) => ({
    toggleSidebar: state.toggleSidebar,
    toggleInspector: state.toggleInspector,
    setSidebarCollapsed: state.setSidebarCollapsed,
    setInspectorCollapsed: state.setInspectorCollapsed,
    setSizes: state.setSizes,
  }))
