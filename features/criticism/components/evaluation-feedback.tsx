'use client'

import { CheckCircle2, AlertCircle, AlertTriangle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DefenseEvaluation } from '../types'

interface EvaluationFeedbackProps {
  evaluation: DefenseEvaluation
  onContinue: () => void
  onEscalate?: () => void
  className?: string
}

const EVALUATION_STYLES = {
  strong: {
    icon: CheckCircle2,
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/20',
    iconColor: 'text-green-600',
    label: 'Strong Defense',
  },
  partial: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/20',
    iconColor: 'text-amber-600',
    label: 'Partial Defense',
  },
  weak: {
    icon: AlertCircle,
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/20',
    iconColor: 'text-red-600',
    label: 'Weak Defense',
  },
}

export function EvaluationFeedback({
  evaluation,
  onContinue,
  onEscalate,
  className,
}: EvaluationFeedbackProps) {
  const style = EVALUATION_STYLES[evaluation.quality]
  const Icon = style.icon

  return (
    <div
      className={cn(
        'rounded-lg border p-4',
        style.bgColor,
        style.borderColor,
        className
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <Icon className={cn('h-5 w-5', style.iconColor)} />
        <span className={cn('font-semibold', style.iconColor)}>
          {style.label}
        </span>
      </div>

      <p className="mb-4 text-sm text-foreground/80 leading-relaxed">
        {evaluation.feedback}
      </p>

      {evaluation.shouldEscalate && evaluation.escalationPrompt && (
        <div className="mb-4 rounded-md bg-background/50 p-3 border border-border/50">
          <p className="text-xs font-medium text-muted-foreground mb-1">
            Follow-up challenge:
          </p>
          <p className="text-sm text-foreground/90 italic">
            {evaluation.escalationPrompt}
          </p>
        </div>
      )}

      <div className="flex items-center gap-2">
        {evaluation.shouldEscalate && onEscalate ? (
          <Button onClick={onEscalate} size="sm" variant="outline" className="gap-2">
            Address Follow-up
            <ArrowRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={onContinue} size="sm" className="gap-2">
            {evaluation.quality === 'strong' ? 'Next Challenge' : 'Continue'}
            <ArrowRight className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
