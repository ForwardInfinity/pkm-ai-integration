import type { LucideIcon } from "lucide-react"

// Navigation item type for sidebar navigation
export interface NavigationItem {
  title: string
  href: string
  icon: LucideIcon
  badge?: boolean
}

// Layout panel sizes (percentages)
export interface LayoutSizes {
  sidebar: number
  main: number
  inspector: number
}

// Layout state for Zustand store
export interface LayoutState {
  isSidebarCollapsed: boolean
  isInspectorCollapsed: boolean
  sizes: LayoutSizes
}

// Layout actions
export interface LayoutActions {
  toggleSidebar: () => void
  toggleInspector: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  setInspectorCollapsed: (collapsed: boolean) => void
  setSizes: (sizes: LayoutSizes) => void
}

// Combined store type
export type LayoutStore = LayoutState & LayoutActions

// Layout constants - extracts magic numbers
export const LAYOUT_CONSTANTS = {
  // Header height used in sidebar and inspector
  HEADER_HEIGHT: 52,

  // Default panel sizes (percentages)
  DEFAULT_SIDEBAR_SIZE: 17,
  DEFAULT_MAIN_SIZE: 63,
  DEFAULT_INSPECTOR_SIZE: 20,

  // Panel size constraints
  SIDEBAR_MIN_SIZE: 12,
  SIDEBAR_MAX_SIZE: 20,
  INSPECTOR_MIN_SIZE: 15,
  INSPECTOR_MAX_SIZE: 30,
  MAIN_MIN_SIZE: 30,
  COLLAPSED_SIZE: 0,

  // Collapsed sidebar width (for icon-only mode)
  COLLAPSED_SIDEBAR_WIDTH: 56,

  // Icon button dimensions
  ICON_BUTTON_SIZE: 40, // Refined: 40px for better touch targets
  ICON_SIZE: 16,        // 4 * 4 = 16px (h-4 w-4)

  // Spacing
  COLLAPSED_GAP: 8,     // Gap between icon buttons when collapsed
} as const

// Cookie configuration for layout persistence
export const COOKIE_CONFIG = {
  LAYOUT_KEY: "refinery-layout",
  OPTIONS: {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax" as const,
  },
} as const
