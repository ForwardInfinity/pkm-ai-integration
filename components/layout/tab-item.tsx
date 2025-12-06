"use client"

import * as React from "react"
import { X, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TabItemProps {
  title: string
  isActive: boolean
  onActivate: () => void
  onClose: () => void
  onMiddleClick?: () => void
}

export function TabItem({
  title,
  isActive,
  onActivate,
  onClose,
  onMiddleClick,
}: TabItemProps) {
  const handleMouseDown = (e: React.MouseEvent) => {
    // Middle click to close
    if (e.button === 1) {
      e.preventDefault()
      onMiddleClick?.()
    }
  }

  const handleCloseClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClose()
  }

  return (
    <TooltipProvider delayDuration={500}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            role="tab"
            aria-selected={isActive}
            tabIndex={isActive ? 0 : -1}
            onClick={onActivate}
            onMouseDown={handleMouseDown}
            className={cn(
              "group relative flex h-9 min-w-[120px] max-w-[200px] items-center gap-2 px-3",
              "border-r border-border/50 transition-colors",
              "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
              isActive
                ? "bg-background text-foreground"
                : "bg-muted/30 text-muted-foreground"
            )}
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate text-sm">{title}</span>
            <span
              role="button"
              tabIndex={0}
              onClick={handleCloseClick}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.stopPropagation()
                  onClose()
                }
              }}
              className={cn(
                "ml-auto shrink-0 rounded p-0.5",
                "opacity-0 transition-opacity",
                "hover:bg-muted-foreground/20 group-hover:opacity-100",
                isActive && "opacity-60"
              )}
              aria-label={`Close ${title}`}
            >
              <X className="h-3 w-3" />
            </span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
