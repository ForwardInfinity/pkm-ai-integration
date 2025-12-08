'use client'

import { useState, useRef, useEffect } from 'react'
import { Shield, Flag, PenLine, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface DefenseInputProps {
  onDefend: (defense: string) => void
  onConcede: () => void
  onRevise: () => void
  isEvaluating?: boolean
  disabled?: boolean
  className?: string
}

export function DefenseInput({
  onDefend,
  onConcede,
  onRevise,
  isEvaluating = false,
  disabled = false,
  className,
}: DefenseInputProps) {
  const [defense, setDefense] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }, [defense])

  // Focus on mount
  useEffect(() => {
    if (textareaRef.current && !disabled) {
      textareaRef.current.focus()
    }
  }, [disabled])

  const handleSubmit = () => {
    if (defense.trim() && !disabled) {
      onDefend(defense.trim())
      setDefense('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={defense}
          onChange={(e) => setDefense(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Defend your position... (Cmd/Ctrl + Enter to submit)"
          disabled={disabled || isEvaluating}
          rows={3}
          className={cn(
            'w-full resize-none rounded-lg border border-input bg-background px-4 py-3',
            'text-sm placeholder:text-muted-foreground',
            'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'transition-all duration-200'
          )}
        />
        {isEvaluating && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-background/80">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Evaluating your defense...
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Button
          onClick={handleSubmit}
          disabled={!defense.trim() || disabled || isEvaluating}
          size="sm"
          className="gap-2"
        >
          <Shield className="h-4 w-4" />
          Defend
        </Button>

        <Button
          onClick={onConcede}
          disabled={disabled || isEvaluating}
          variant="outline"
          size="sm"
          className="gap-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
        >
          <Flag className="h-4 w-4" />
          Concede Point
        </Button>

        <Button
          onClick={onRevise}
          disabled={disabled || isEvaluating}
          variant="ghost"
          size="sm"
          className="gap-2 ml-auto"
        >
          <PenLine className="h-4 w-4" />
          Revise Note
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Tip: A strong defense addresses the specific challenge, provides evidence or reasoning, and acknowledges valid limitations.
      </p>
    </div>
  )
}
