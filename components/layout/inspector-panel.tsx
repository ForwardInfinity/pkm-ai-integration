"use client"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { PanelRightClose } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface InspectorPanelProps {
  isCollapsed: boolean
  children?: React.ReactNode
  onToggle?: () => void
}

export function InspectorPanel({ isCollapsed, children, onToggle }: InspectorPanelProps) {
  if (isCollapsed) {
    return null
  }

  return (
    <div className="relative flex flex-col h-full bg-muted/10">
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

      {/* Collapse button */}
      {onToggle && (
        <div className="absolute bottom-2 left-2">
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                  onClick={onToggle}
                >
                  <PanelRightClose className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Collapse inspector</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
    </div>
  )
}

