"use client"

import * as React from "react"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { cn } from "@/lib/utils"
import { AppSidebar } from "@/components/layout/app-sidebar"
import { InspectorPanel } from "@/components/layout/inspector-panel"

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(defaultCollapsed)
  const [isInspectorCollapsed, setIsInspectorCollapsed] = React.useState(false)

  return (
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
          isSidebarCollapsed && "min-w-[50px] transition-all duration-300 ease-in-out"
        )}
      >
        <AppSidebar isCollapsed={isSidebarCollapsed} email={email} />
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          {children}
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={defaultLayout[2]}
        collapsible={true}
        minSize={15}
        maxSize={30}
        onCollapse={() => setIsInspectorCollapsed(true)}
        onExpand={() => setIsInspectorCollapsed(false)}
        className={cn(
            isInspectorCollapsed && "min-w-[0px] hidden" 
          )}
      >
        <InspectorPanel isCollapsed={isInspectorCollapsed} />
      </ResizablePanel>
    </ResizablePanelGroup>
  )
}

