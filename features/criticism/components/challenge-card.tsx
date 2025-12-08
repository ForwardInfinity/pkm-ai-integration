'use client'

import { Swords, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CHALLENGE_ANGLE_LABELS, type ChallengeAngle } from '../types'

interface ChallengeCardProps {
  angle: ChallengeAngle
  content: string
  isStreaming?: boolean
  className?: string
}

export function ChallengeCard({
  angle,
  content,
  isStreaming = false,
  className,
}: ChallengeCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-destructive/20 bg-destructive/5 p-4',
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-destructive/10">
          <Swords className="h-4 w-4 text-destructive" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-destructive">
            Challenge
          </p>
          <p className="text-sm font-semibold text-foreground">
            {CHALLENGE_ANGLE_LABELS[angle]}
          </p>
        </div>
        {isStreaming && (
          <Loader2 className="ml-auto h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">
          {content}
          {isStreaming && (
            <span className="inline-block w-2 h-4 ml-0.5 bg-foreground/50 animate-pulse" />
          )}
        </p>
      </div>
    </div>
  )
}

interface ThesisCardProps {
  thesis: string
  className?: string
}

export function ThesisCard({ thesis, className }: ThesisCardProps) {
  return (
    <div
      className={cn(
        'rounded-lg border border-primary/20 bg-primary/5 p-4',
        className
      )}
    >
      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-primary">
        Your Thesis
      </p>
      <p className="text-sm text-foreground/90 leading-relaxed italic">
        &ldquo;{thesis}&rdquo;
      </p>
    </div>
  )
}
