'use client'

import { useState, useCallback } from 'react'
import { reconstructProblem } from '../actions/reconstruct-problem'
import type { ProblemReconstructionResult } from '../types'

interface UseReconstructProblemState {
  isLoading: boolean
  error: string | null
  result: ProblemReconstructionResult | null
  currentIndex: number
}

interface UseReconstructProblemReturn extends UseReconstructProblemState {
  reconstruct: (content: string, title: string) => Promise<void>
  fetchAlternatives: (content: string, title: string) => Promise<void>
  nextAlternative: () => string | null
  reset: () => void
  currentSuggestion: string | null
}

export function useReconstructProblem(): UseReconstructProblemReturn {
  const [state, setState] = useState<UseReconstructProblemState>({
    isLoading: false,
    error: null,
    result: null,
    currentIndex: 0,
  })

  const reconstruct = useCallback(
    async (content: string, title: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await reconstructProblem(content, title, false)
        setState({
          isLoading: false,
          error: null,
          result,
          currentIndex: 0,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to reconstruct problem',
        }))
      }
    },
    []
  )

  const fetchAlternatives = useCallback(
    async (content: string, title: string) => {
      setState((prev) => ({ ...prev, isLoading: true, error: null }))

      try {
        const result = await reconstructProblem(content, title, true)
        setState({
          isLoading: false,
          error: null,
          result,
          currentIndex: 0,
        })
      } catch (err) {
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to get alternatives',
        }))
      }
    },
    []
  )

  const nextAlternative = useCallback(() => {
    const { result, currentIndex } = state
    if (!result?.alternatives?.length) return null

    const nextIndex = currentIndex + 1
    if (nextIndex <= result.alternatives.length) {
      setState((prev) => ({ ...prev, currentIndex: nextIndex }))
      return result.alternatives[nextIndex - 1] || null
    }
    return null
  }, [state])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      currentIndex: 0,
    })
  }, [])

  const currentSuggestion =
    state.result && state.currentIndex === 0
      ? state.result.suggestion
      : state.result?.alternatives?.[state.currentIndex - 1] || null

  return {
    ...state,
    reconstruct,
    fetchAlternatives,
    nextAlternative,
    reset,
    currentSuggestion,
  }
}
