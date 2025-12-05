"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TooltipIconButtonProps {
  icon: React.ReactNode
  tooltip: string
  tooltipSide?: "top" | "right" | "bottom" | "left"
  onClick?: () => void
  variant?: "default" | "ghost" | "outline" | "secondary" | "destructive" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
  disabled?: boolean
  "aria-label"?: string
  "aria-expanded"?: boolean
  "aria-controls"?: string
}

export function TooltipIconButton({
  icon,
  tooltip,
  tooltipSide = "right",
  onClick,
  variant = "ghost",
  size = "icon",
  className,
  disabled,
  "aria-label": ariaLabel,
  "aria-expanded": ariaExpanded,
  "aria-controls": ariaControls,
}: TooltipIconButtonProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={variant}
            size={size}
            className={cn(
              "h-6 w-6 text-muted-foreground hover:text-foreground",
              className
            )}
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel || tooltip}
            aria-expanded={ariaExpanded}
            aria-controls={ariaControls}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>{tooltip}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
