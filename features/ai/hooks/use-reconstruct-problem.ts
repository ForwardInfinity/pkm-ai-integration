'use client'

import { useState, useCallback } from 'react'
import { reconstructProblem } from '../actions/reconstruct-problem'
import type { ProblemReconstructionResult } from '../types'

interface UseReconstructProblemState {
  isLoading: boolean
  error: string | null
  result: ProblemReconstructionResult | null
  currentSuggestion: string | null
  showAlternatives: boolean
}

interface UseReconstructProblemReturn extends UseReconstructProblemState {
  reconstruct: (content: string, title: string) => Promise<void>
  fetchAlternatives: (content: string, title: string) => Promise<void>
  selectAlternative: (index: number) => void
  reset: () => void
}

export function useReconstructProblem(): UseReconstructProblemReturn {
  const [state, setState] = useState<UseReconstructProblemState>({
    isLoading: false,
    error: null,
    result: null,
    currentSuggestion: null,
    showAlternatives: false,
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
          currentSuggestion: result.suggestion,
          showAlternatives: false,
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
        setState((prev) => ({
          isLoading: false,
          error: null,
          result,
          currentSuggestion: prev.currentSuggestion || result.suggestion,
          showAlternatives: true,
        }))
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

  const selectAlternative = useCallback((index: number) => {
    setState((prev) => {
      const alternative = prev.result?.alternatives?.[index]
      if (!alternative) return prev
      return {
        ...prev,
        currentSuggestion: alternative,
        showAlternatives: false,
      }
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      currentSuggestion: null,
      showAlternatives: false,
    })
  }, [])

  return {
    ...state,
    reconstruct,
    fetchAlternatives,
    selectAlternative,
    reset,
  }
}
