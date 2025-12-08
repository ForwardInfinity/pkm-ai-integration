'use client'

import { useState, useEffect, useCallback } from 'react'
import { Flame, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useCrucibleOpen, useCrucibleActions } from '@/stores'
import { useCrucible } from '../hooks/use-crucible'
import { CrucibleProgress } from './crucible-progress'
import { ThesisCard, ChallengeCard } from './challenge-card'
import { DefenseInput } from './defense-input'
import { EvaluationFeedback } from './evaluation-feedback'
import { CrucibleReport } from './crucible-report'
import type { CrucibleReport as CrucibleReportType } from '../types'

interface CrucibleDialogProps {
  noteId: string
  title: string
  problem: string | null
  content: string
}

export function CrucibleDialog({
  noteId,
  title,
  problem,
  content,
}: CrucibleDialogProps) {
  const isOpen = useCrucibleOpen()
  const { closeCrucible } = useCrucibleActions()
  const [report, setReport] = useState<CrucibleReportType | null>(null)

  const {
    session,
    currentChallenge,
    currentExchange,
    isStreaming,
    startCrucible,
    submitDefense,
    concedeChallenge,
    proceedToNext,
    resetCrucible,
    generateReport,
  } = useCrucible({ noteId, title, problem, content })

  // Start crucible when dialog opens and there's no session
  useEffect(() => {
    if (isOpen && !session) {
      startCrucible()
    }
  }, [isOpen, session, startCrucible])

  // Generate report when session completes
  useEffect(() => {
    if (session?.status === 'complete' && !report) {
      generateReport().then((r) => {
        if (r) setReport(r)
      })
    }
  }, [session?.status, report, generateReport])

  const handleClose = useCallback(() => {
    closeCrucible()
    // Delay reset to allow animation
    setTimeout(() => {
      resetCrucible()
      setReport(null)
    }, 300)
  }, [closeCrucible, resetCrucible])

  const handleConcede = useCallback(() => {
    concedeChallenge()
    proceedToNext()
  }, [concedeChallenge, proceedToNext])

  const handleRevise = useCallback(() => {
    // Close dialog to let user edit the note
    handleClose()
  }, [handleClose])

  const handleSaveAsNote = useCallback(() => {
    // TODO: Create a linked critique note with the report content
    console.log('Save as note:', report)
    handleClose()
  }, [report, handleClose])

  // Determine current UI state
  const isAnalyzing = session?.status === 'analyzing'
  const isComplete = session?.status === 'complete'
  const showChallenge = currentExchange && !isComplete
  const showEvaluation = currentExchange?.evaluation && !isComplete
  const showDefenseInput =
    session?.status === 'awaiting_defense' && !currentExchange?.evaluation

  // Get current angle for progress display
  const getCurrentAngle = () => {
    if (!session) return undefined
    const angles = [
      'hidden_assumption',
      'logical_gap',
      'steelmanned_counter',
      'empirical_challenge',
      'scope_limits',
    ] as const
    return angles[(session.currentRound - 1) % angles.length]
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-2xl h-[80vh] flex flex-col p-0 gap-0">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 px-6 pt-6 pb-4 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
              <Flame className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-xl">The Crucible</DialogTitle>
              <DialogDescription>
                Defend your thesis against systematic criticism
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden px-6 py-4">
          {isAnalyzing && (
            <div className="flex flex-col items-center justify-center h-full gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <div className="text-center">
                <p className="font-medium">Analyzing your note...</p>
                <p className="text-sm text-muted-foreground">
                  Identifying thesis and key claims
                </p>
              </div>
            </div>
          )}

          {isComplete && report && (
            <CrucibleReport
              report={report}
              onSaveAsNote={handleSaveAsNote}
              onClose={handleClose}
            />
          )}

          {!isAnalyzing && !isComplete && session && (
            <div className="flex flex-col h-full gap-4">
              {/* Progress */}
              <CrucibleProgress
                currentRound={session.currentRound}
                totalRounds={session.totalRounds}
                currentAngle={getCurrentAngle()}
              />

              <ScrollArea className="flex-1">
                <div className="space-y-4 pr-4">
                  {/* Thesis */}
                  <ThesisCard thesis={session.thesis.thesis} />

                  {/* Current Challenge */}
                  {(isStreaming || showChallenge) && (
                    <ChallengeCard
                      angle={getCurrentAngle() || 'hidden_assumption'}
                      content={
                        isStreaming
                          ? currentChallenge
                          : currentExchange?.challenge.content || ''
                      }
                      isStreaming={isStreaming}
                    />
                  )}

                  {/* Evaluation Feedback */}
                  {showEvaluation && currentExchange?.evaluation && (
                    <EvaluationFeedback
                      evaluation={currentExchange.evaluation}
                      onContinue={proceedToNext}
                    />
                  )}
                </div>
              </ScrollArea>

              {/* Defense Input */}
              {showDefenseInput && (
                <div className="flex-shrink-0 border-t pt-4">
                  <DefenseInput
                    onDefend={submitDefense}
                    onConcede={handleConcede}
                    onRevise={handleRevise}
                    isEvaluating={session.status === 'evaluating'}
                    disabled={isStreaming}
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
