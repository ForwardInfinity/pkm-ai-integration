'use client'

import { cn } from '@/lib/utils'
import { CHALLENGE_ANGLE_LABELS, type ChallengeAngle } from '../types'

interface CrucibleProgressProps {
  currentRound: number
  totalRounds: number
  currentAngle?: ChallengeAngle
  className?: string
}

export function CrucibleProgress({
  currentRound,
  totalRounds,
  currentAngle,
  className,
}: CrucibleProgressProps) {
  const percentage = Math.round((currentRound / totalRounds) * 100)

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Round {currentRound} of {totalRounds}
        </span>
        {currentAngle && (
          <span className="font-medium text-primary">
            {CHALLENGE_ANGLE_LABELS[currentAngle]}
          </span>
        )}
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${percentage}%` }}
        />
      </div>
      <div className="flex justify-between">
        {Array.from({ length: totalRounds }).map((_, i) => (
          <div
            key={i}
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i < currentRound
                ? 'bg-primary'
                : i === currentRound - 1
                  ? 'bg-primary animate-pulse'
                  : 'bg-muted'
            )}
          />
        ))}
      </div>
    </div>
  )
}
