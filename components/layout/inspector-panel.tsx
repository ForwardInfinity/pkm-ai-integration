"use client"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

interface InspectorPanelProps {
  isCollapsed: boolean
  children?: React.ReactNode
}

export function InspectorPanel({ isCollapsed, children }: InspectorPanelProps) {
  if (isCollapsed) {
    return null
  }

  return (
    <div className="flex flex-col h-full bg-muted/10">
      <div className="flex h-[52px] items-center px-4">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Inspector
        </h2>
      </div>
      <Separator />
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          {children ? children : (
             <div className="text-sm text-muted-foreground text-center py-8">
                Select a note to view details
             </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

