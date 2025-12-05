"use client"

import * as React from "react"
import type { ImperativePanelHandle } from "react-resizable-panels"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { InspectorPanel } from "@/components/layout/inspector-panel"
import { PanelRight, PanelLeft } from "lucide-react"
import { TooltipIconButton } from "@/components/shared/tooltip-icon-button"
import { useLayoutStore } from "@/stores/layout-store"
import { LAYOUT_CONSTANTS } from "@/types/layout.types"

interface ThreePanelLayoutProps {
  children: React.ReactNode
  defaultLayout?: number[]
  defaultCollapsed?: boolean
  defaultInspectorCollapsed?: boolean
  email?: string
}

export function ThreePanelLayout({
  children,
  defaultLayout,
  defaultCollapsed,
  defaultInspectorCollapsed,
  email,
}: ThreePanelLayoutProps) {
  const sidebarRef = React.useRef<ImperativePanelHandle>(null)
  const inspectorRef = React.useRef<ImperativePanelHandle>(null)

  // Use Zustand store for state
  const {
    isSidebarCollapsed,
    isInspectorCollapsed,
    sizes,
    setSidebarCollapsed,
    setInspectorCollapsed,
    setSizes,
  } = useLayoutStore()

  // Initialize from server-side defaults on mount (handles hydration)
  const initialized = React.useRef(false)
  React.useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    if (defaultCollapsed !== undefined) {
      setSidebarCollapsed(defaultCollapsed)
    }
    if (defaultInspectorCollapsed !== undefined) {
      setInspectorCollapsed(defaultInspectorCollapsed)
    }
    if (defaultLayout && defaultLayout.length === 3) {
      setSizes({
        sidebar: defaultLayout[0],
        main: defaultLayout[1],
        inspector: defaultLayout[2],
      })
    }
  }, [defaultCollapsed, defaultInspectorCollapsed, defaultLayout, setSidebarCollapsed, setInspectorCollapsed, setSizes])

  const toggleSidebar = React.useCallback(() => {
    const panel = sidebarRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }, [])

  const toggleInspector = React.useCallback(() => {
    const panel = inspectorRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }, [])

  const handleLayoutChange = React.useCallback(
    (newSizes: number[]) => {
      if (newSizes.length === 3) {
        setSizes({
          sidebar: newSizes[0],
          main: newSizes[1],
          inspector: newSizes[2],
        })
      }
    },
    [setSizes]
  )

  // Get initial sizes from store or defaults
  const initialSizes = React.useMemo(() => ({
    sidebar: sizes.sidebar || defaultLayout?.[0] || LAYOUT_CONSTANTS.DEFAULT_SIDEBAR_SIZE,
    main: sizes.main || defaultLayout?.[1] || LAYOUT_CONSTANTS.DEFAULT_MAIN_SIZE,
    inspector: sizes.inspector || defaultLayout?.[2] || LAYOUT_CONSTANTS.DEFAULT_INSPECTOR_SIZE,
  }), [sizes, defaultLayout])

  return (
    <div className="relative h-full" role="main">
      {/* Sidebar expand button when collapsed */}
      {isSidebarCollapsed && (
        <div className="absolute bottom-2 left-2 z-50">
          <TooltipIconButton
            icon={<PanelLeft className="h-4 w-4" />}
            tooltip="Expand sidebar"
            tooltipSide="right"
            onClick={toggleSidebar}
            aria-label="Expand sidebar"
            aria-expanded={false}
            aria-controls="app-sidebar"
          />
        </div>
      )}

      {/* Inspector expand button when collapsed */}
      {isInspectorCollapsed && (
        <div className="absolute bottom-2 right-2 z-50">
          <TooltipIconButton
            icon={<PanelRight className="h-4 w-4" />}
            tooltip="Expand inspector"
            tooltipSide="left"
            onClick={toggleInspector}
            aria-label="Expand inspector"
            aria-expanded={false}
            aria-controls="inspector-panel"
          />
        </div>
      )}

      <ResizablePanelGroup
        direction="horizontal"
        onLayout={handleLayoutChange}
        className="h-full items-stretch"
      >
        {/* Sidebar Panel */}
        <ResizablePanel
          ref={sidebarRef}
          id="sidebar-panel"
          defaultSize={initialSizes.sidebar}
          collapsedSize={LAYOUT_CONSTANTS.COLLAPSED_SIZE}
          collapsible={true}
          minSize={LAYOUT_CONSTANTS.SIDEBAR_MIN_SIZE}
          maxSize={LAYOUT_CONSTANTS.SIDEBAR_MAX_SIZE}
          onCollapse={() => setSidebarCollapsed(true)}
          onExpand={() => setSidebarCollapsed(false)}
          className={cn(
            "transition-all duration-300 ease-in-out",
            isSidebarCollapsed && "min-w-0"
          )}
        >
          <AppSidebar
            isCollapsed={isSidebarCollapsed}
            email={email}
            onToggle={toggleSidebar}
          />
        </ResizablePanel>

        <ResizableHandle
          className="w-px bg-border hover:bg-primary/20 transition-colors"
          aria-label="Resize sidebar"
        />

        {/* Main Content Panel */}
        <ResizablePanel
          id="main-panel"
          defaultSize={initialSizes.main}
          minSize={LAYOUT_CONSTANTS.MAIN_MIN_SIZE}
        >
          {children}
        </ResizablePanel>

        <ResizableHandle
          className="w-px bg-border hover:bg-primary/20 transition-colors"
          aria-label="Resize inspector"
        />

        {/* Inspector Panel */}
        <ResizablePanel
          ref={inspectorRef}
          id="inspector-panel-container"
          defaultSize={initialSizes.inspector}
          collapsedSize={LAYOUT_CONSTANTS.COLLAPSED_SIZE}
          collapsible={true}
          minSize={LAYOUT_CONSTANTS.INSPECTOR_MIN_SIZE}
          maxSize={LAYOUT_CONSTANTS.INSPECTOR_MAX_SIZE}
          onCollapse={() => setInspectorCollapsed(true)}
          onExpand={() => setInspectorCollapsed(false)}
          className={cn(
            "transition-all duration-300 ease-in-out",
            isInspectorCollapsed && "min-w-0"
          )}
        >
          <InspectorPanel
            isCollapsed={isInspectorCollapsed}
            onToggle={toggleInspector}
          />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}
