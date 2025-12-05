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
import { PanelLeftClose, PanelLeft, PanelRightClose, PanelRight } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface ThreePanelLayoutProps {
  children: React.ReactNode
  defaultLayout?: number[] | undefined
  defaultCollapsed?: boolean
  navCollapsedSize?: number
  email?: string
}

export function ThreePanelLayout({
  children,
  defaultLayout = [17, 63, 20],
  defaultCollapsed = false,
  navCollapsedSize = 4,
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
      {/* Floating Toggle Buttons */}
      <TooltipProvider delayDuration={0}>
        {/* Left Sidebar Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-3 z-50 h-7 w-7 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent transition-all duration-300",
                isSidebarCollapsed ? "left-[58px]" : "left-[calc(17%-8px)]"
              )}
              style={{
                left: isSidebarCollapsed ? "58px" : undefined,
              }}
              onClick={toggleSidebar}
            >
              {isSidebarCollapsed ? (
                <PanelLeft className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">
            {isSidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
          </TooltipContent>
        </Tooltip>

        {/* Right Inspector Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "absolute top-3 z-50 h-7 w-7 rounded-md bg-background/80 backdrop-blur-sm border shadow-sm hover:bg-accent transition-all duration-300",
                isInspectorCollapsed ? "right-2" : "right-[calc(20%-8px)]"
              )}
              onClick={toggleInspector}
            >
              {isInspectorCollapsed ? (
                <PanelRight className="h-4 w-4" />
              ) : (
                <PanelRightClose className="h-4 w-4" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            {isInspectorCollapsed ? "Mở rộng inspector" : "Thu gọn inspector"}
          </TooltipContent>
        </Tooltip>
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
          collapsedSize={navCollapsedSize}
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
            isSidebarCollapsed && "min-w-[50px]"
          )}
        >
          <AppSidebar isCollapsed={isSidebarCollapsed} email={email} />
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
          <InspectorPanel isCollapsed={isInspectorCollapsed} />
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  )
}

