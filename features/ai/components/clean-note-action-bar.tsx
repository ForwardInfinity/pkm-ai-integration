'use client'

import { Button } from '@/components/ui/button'
import { Check, X, Eye } from 'lucide-react'
import { cn } from '@/lib/utils'

interface CleanNoteActionBarProps {
  visible: boolean
  onAccept: () => void
  onReject: () => void
  onPreview: () => void
  className?: string
}

export function CleanNoteActionBar({
  visible,
  onAccept,
  onReject,
  onPreview,
  className,
}: CleanNoteActionBarProps) {
  if (!visible) return null

  return (
    <div
      role="toolbar"
      aria-label="Clean note actions"
      className={cn(
        'fixed bottom-6 left-1/2 -translate-x-1/2 z-50',
        'flex items-center gap-1 px-2 py-1.5',
        'bg-background/95 backdrop-blur-sm',
        'border border-border rounded-full shadow-lg',
        'animate-in slide-in-from-bottom-4 fade-in duration-300',
        className
      )}
    >
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onReject}
        className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
      >
        <X className="h-4 w-4 mr-1.5" />
        Reject
      </Button>
      <div className="w-px h-5 bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onPreview}
        className="h-8 px-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-full"
      >
        <Eye className="h-4 w-4 mr-1.5" />
        Preview
      </Button>
      <div className="w-px h-5 bg-border" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={onAccept}
        className="h-8 px-3 text-sm text-primary hover:text-primary hover:bg-primary/10 rounded-full"
      >
        <Check className="h-4 w-4 mr-1.5" />
        Accept
      </Button>
    </div>
  )
}
