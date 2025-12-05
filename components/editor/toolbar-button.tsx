'use client'

import type { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface ToolbarButtonProps {
  icon: LucideIcon
  tooltip: string
  isActive?: boolean
  onClick: () => void
  disabled?: boolean
}

export function ToolbarButton({
  icon: Icon,
  tooltip,
  isActive,
  onClick,
  disabled,
}: ToolbarButtonProps) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn(
              'h-8 w-8 p-0',
              isActive && 'bg-accent text-accent-foreground'
            )}
          >
            <Icon className="h-4 w-4" />
            <span className="sr-only">{tooltip}</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
