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
import { Button } from "@/components/ui/button"
import { PanelRight, PanelLeft } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ThreePanelLayoutProps {
  children: React.ReactNode
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  email?: string
}

export function ThreePanelLayout({
  children,
  defaultLayout = [17, 63, 20],
  defaultCollapsed = false,
  email,
}: ThreePanelLayoutProps) {
  const sidebarRef = React.useRef<ImperativePanelHandle>(null)
  const inspectorRef = React.useRef<ImperativePanelHandle>(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(defaultCollapsed)
  const [isInspectorCollapsed, setIsInspectorCollapsed] = React.useState(false)

  const toggleSidebar = () => {
    const panel = sidebarRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }

  const toggleInspector = () => {
    const panel = inspectorRef.current
    if (panel) {
      if (panel.isCollapsed()) {
        panel.expand()
      } else {
        panel.collapse()
      }
    }
  }

  return (
    <div className="relative h-full">
      <TooltipProvider delayDuration={0}>
        {/* Sidebar expand button when collapsed */}
        {isSidebarCollapsed && (
          <div className="absolute bottom-2 left-2 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={toggleSidebar}
                >
                  <PanelLeft className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">Expand sidebar</TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* Inspector expand button when collapsed */}
        {isInspectorCollapsed && (
          <div className="absolute bottom-2 right-2 z-50">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={toggleInspector}
                >
                  <PanelRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Expand inspector</TooltipContent>
            </Tooltip>
          </div>
        )}
      </TooltipProvider>

      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes
          )}`
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          ref={sidebarRef}
          defaultSize={defaultLayout[0]}
          collapsedSize={0}
          collapsible={true}
          minSize={12}
          maxSize={20}
          onCollapse={() => {
            setIsSidebarCollapsed(true)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true
            )}`
          }}
          onExpand={() => {
            setIsSidebarCollapsed(false)
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false
            )}`
          }}
          className={cn(
            "transition-all duration-300 ease-in-out",
            isSidebarCollapsed && "min-w-0"
          )}
        >
          <AppSidebar isCollapsed={isSidebarCollapsed} email={email} onToggle={toggleSidebar} />
        </ResizablePanel>
        
        <ResizableHandle className="w-px bg-border hover:bg-primary/20 transition-colors" />
        
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          {children}
        </ResizablePanel>
        
        <ResizableHandle className="w-px bg-border hover:bg-primary/20 transition-colors" />
        
        <ResizablePanel
          ref={inspectorRef}
          defaultSize={defaultLayout[2]}
          collapsedSize={0}
          collapsible={true}
          minSize={15}
          maxSize={30}
          onCollapse={() => setIsInspectorCollapsed(true)}
          onExpand={() => setIsInspectorCollapsed(false)}
          className={cn(
            "transition-all duration-300 ease-in-out",
            isInspectorCollapsed && "min-w-0"
          )}
        >
          <InspectorPanel isCollapsed={isInspectorCollapsed} onToggle={toggleInspector} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

