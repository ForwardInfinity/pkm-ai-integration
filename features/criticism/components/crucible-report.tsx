'use client'

import { Trophy, AlertTriangle, Lightbulb, Clock, Save, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { CHALLENGE_ANGLE_LABELS } from '../types'
import type { CrucibleReport as CrucibleReportType } from '../types'

interface CrucibleReportProps {
  report: CrucibleReportType
  onSaveAsNote: () => void
  onClose: () => void
  className?: string
}

function formatDuration(ms: number): string {
  const minutes = Math.floor(ms / 60000)
  const seconds = Math.floor((ms % 60000) / 1000)
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`
  }
  return `${seconds}s`
}

export function CrucibleReport({
  report,
  onSaveAsNote,
  onClose,
  className,
}: CrucibleReportProps) {
  const hasWeaknesses = report.concessions.length > 0
  const hasSurvived = report.survivedChallenges.length > 0

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex-shrink-0 border-b pb-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">Crucible Complete</h3>
              <p className="text-sm text-muted-foreground">
                Your thesis has been tested
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            {formatDuration(report.duration)}
          </div>
        </div>

        {/* Stats */}
        <div className="flex gap-4 mt-4">
          <div className="flex-1 rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-green-600">
              {report.survivedChallenges.length}
            </p>
            <p className="text-xs text-green-600/80">Survived</p>
          </div>
          <div className="flex-1 rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-center">
            <p className="text-2xl font-bold text-amber-600">
              {report.concessions.length}
            </p>
            <p className="text-xs text-amber-600/80">Conceded</p>
          </div>
          <div className="flex-1 rounded-lg bg-muted p-3 text-center">
            <p className="text-2xl font-bold text-foreground">
              {report.completedRounds}
            </p>
            <p className="text-xs text-muted-foreground">Rounds</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="space-y-6 pr-4">
          {/* Thesis Reminder */}
          <div>
            <h4 className="text-sm font-medium mb-2 text-muted-foreground">
              Tested Thesis
            </h4>
            <p className="text-sm italic text-foreground/80 bg-muted/50 p-3 rounded-lg">
              &ldquo;{report.thesis}&rdquo;
            </p>
          </div>

          {/* Survived Challenges */}
          {hasSurvived && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-green-600">
                <Trophy className="h-4 w-4" />
                Challenges Survived
              </h4>
              <div className="space-y-3">
                {report.survivedChallenges.map((item, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-green-500/20 bg-green-500/5 p-3"
                  >
                    <p className="text-xs font-medium text-green-600 mb-1">
                      {CHALLENGE_ANGLE_LABELS[item.angle]}
                    </p>
                    <p className="text-sm text-foreground/80 mb-2">
                      {item.challenge}
                    </p>
                    <div className="bg-background/50 rounded p-2 border-l-2 border-green-500">
                      <p className="text-xs text-muted-foreground mb-1">
                        Your defense:
                      </p>
                      <p className="text-sm text-foreground/70">{item.defense}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Concessions */}
          {hasWeaknesses && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
                Weaknesses Identified
              </h4>
              <div className="space-y-2">
                {report.concessions.map((concession, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3"
                  >
                    <p className="text-sm text-foreground/80">{concession}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Revisions */}
          {report.suggestedRevisions.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2 text-primary">
                <Lightbulb className="h-4 w-4" />
                Suggested Revisions
              </h4>
              <div className="space-y-2">
                {report.suggestedRevisions.map((revision, i) => (
                  <div
                    key={i}
                    className="rounded-lg border bg-primary/5 border-primary/20 p-3"
                  >
                    <p className="text-sm text-foreground/80">{revision}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className="flex-shrink-0 border-t pt-4 mt-4 flex items-center gap-2">
        <Button onClick={onSaveAsNote} className="gap-2">
          <Save className="h-4 w-4" />
          Save as Critique Note
        </Button>
        <Button onClick={onClose} variant="outline" className="gap-2">
          <X className="h-4 w-4" />
          Close
        </Button>
      </div>
    </div>
  )
}
