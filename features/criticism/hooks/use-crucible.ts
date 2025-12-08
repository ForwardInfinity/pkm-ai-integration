'use client'

import { useCallback, useRef } from 'react'
import { readStreamableValue } from '@ai-sdk/rsc'
import {
  useCrucibleSession,
  useCrucibleActions,
  useCrucibleStreaming,
  useCurrentExchange,
} from '@/stores'
import { analyzeNote } from '../actions/analyze-note'
import { generateChallenge } from '../actions/generate-challenge'
import { evaluateDefense } from '../actions/evaluate-defense'
import { generateReport } from '../actions/generate-report'
import { CHALLENGE_ANGLES, type ChallengeAngle, type CrucibleReport, type Exchange } from '../types'

interface UseCrucibleOptions {
  noteId: string
  title: string
  problem: string | null
  content: string
}

export function useCrucible({ noteId, title, problem, content }: UseCrucibleOptions) {
  const session = useCrucibleSession()
  const { currentChallenge, isStreaming } = useCrucibleStreaming()
  const currentExchange = useCurrentExchange()
  const actions = useCrucibleActions()
  const reportRef = useRef<CrucibleReport | null>(null)

  // Get the current angle based on round
  const getCurrentAngle = useCallback((): ChallengeAngle => {
    const roundIndex = (session?.currentRound ?? 1) - 1
    return CHALLENGE_ANGLES[roundIndex % CHALLENGE_ANGLES.length]
  }, [session?.currentRound])

  // Start the crucible session
  const startCrucible = useCallback(async () => {
    try {
      actions.setStatus('analyzing')
      actions.openCrucible()

      // Analyze the note to extract thesis
      const thesis = await analyzeNote(title, problem, content)
      
      // Start the session
      actions.startSession(noteId, thesis, CHALLENGE_ANGLES.length)

      // Generate first challenge
      await generateNextChallenge(thesis.thesis, [])
    } catch (error) {
      console.error('Failed to start crucible:', error)
      actions.reset()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [noteId, title, problem, content])

  // Generate the next challenge
  const generateNextChallenge = useCallback(
    async (thesis: string, exchanges: Exchange[]) => {
      if (!session && !thesis) return

      const currentThesis = thesis || session?.thesis.thesis || ''
      const currentExchanges = exchanges || session?.exchanges || []
      const angle = getCurrentAngle()

      actions.setStreaming(true)
      actions.setStatus('challenging')

      try {
        const { challenge } = await generateChallenge(
          currentThesis,
          content,
          angle,
          currentExchanges
        )

        let fullChallenge = ''
        for await (const delta of readStreamableValue(challenge)) {
          fullChallenge += delta
          actions.updateStreamingChallenge(fullChallenge)
        }

        // Add the completed challenge
        actions.addChallenge(angle, fullChallenge)
      } catch (error) {
        console.error('Failed to generate challenge:', error)
        actions.setStreaming(false)
      }
    },
    [session, getCurrentAngle, content, actions]
  )

  // Submit a defense
  const submitDefense = useCallback(
    async (defense: string) => {
      if (!session || !currentExchange) return

      // Add the defense
      actions.addDefense(currentExchange.challenge.id, defense)

      // Evaluate the defense
      try {
        const evaluation = await evaluateDefense(
          currentExchange.challenge,
          defense,
          session.thesis.thesis
        )

        actions.setEvaluation(currentExchange.challenge.id, evaluation)
      } catch (error) {
        console.error('Failed to evaluate defense:', error)
        // Provide a fallback evaluation
        actions.setEvaluation(currentExchange.challenge.id, {
          quality: 'partial',
          feedback: 'Unable to evaluate. Proceeding to next challenge.',
          shouldEscalate: false,
        })
      }
    },
    [session, currentExchange, actions]
  )

  // Concede the current challenge
  const concedeChallenge = useCallback(() => {
    if (!currentExchange) return
    actions.concedeChallenge(currentExchange.challenge.id)
  }, [currentExchange, actions])

  // Move to next round or complete
  const proceedToNext = useCallback(async () => {
    if (!session) return

    const nextRound = session.currentRound + 1

    if (nextRound > session.totalRounds) {
      // Complete the session
      actions.completeSession()
      
      // Generate report
      try {
        const report = await generateReport({
          ...session,
          status: 'complete',
          completedAt: Date.now(),
        })
        reportRef.current = report
      } catch (error) {
        console.error('Failed to generate report:', error)
      }
    } else {
      actions.advanceRound()
      // Generate next challenge
      await generateNextChallenge(session.thesis.thesis, session.exchanges)
    }
  }, [session, actions, generateNextChallenge])

  // Close and reset
  const closeCrucible = useCallback(() => {
    actions.closeCrucible()
  }, [actions])

  const resetCrucible = useCallback(() => {
    actions.reset()
    reportRef.current = null
  }, [actions])

  return {
    session,
    currentChallenge,
    currentExchange,
    isStreaming,
    report: reportRef.current,
    startCrucible,
    submitDefense,
    concedeChallenge,
    proceedToNext,
    closeCrucible,
    resetCrucible,
    generateReport: async () => {
      if (!session) return null
      const report = await generateReport(session)
      reportRef.current = report
      return report
    },
  }
}
