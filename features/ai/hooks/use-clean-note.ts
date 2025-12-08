'use client'

import { useState, useCallback } from 'react'
import { cleanNote } from '../actions/clean-note'
import type { CleanedNote } from '../types'

interface UseCleanNoteState {
  isLoading: boolean
  error: string | null
  result: CleanedNote | null
  original: { title: string; problem: string; content: string } | null
}

interface UseCleanNoteReturn extends UseCleanNoteState {
  clean: (title: string, problem: string, content: string) => Promise<void>
  accept: () => CleanedNote | null
  reject: () => void
  reset: () => void
}

export function useCleanNote(): UseCleanNoteReturn {
  const [state, setState] = useState<UseCleanNoteState>({
    isLoading: false,
    error: null,
    result: null,
    original: null,
  })

  const clean = useCallback(async (title: string, problem: string, content: string) => {
    setState({
      isLoading: true,
      error: null,
      result: null,
      original: { title, problem, content },
    })

    try {
      const result = await cleanNote(title, problem, content)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        result,
      }))
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to clean note',
      }))
    }
  }, [])

  const accept = useCallback(() => {
    const result = state.result
    setState({
      isLoading: false,
      error: null,
      result: null,
      original: null,
    })
    return result
  }, [state.result])

  const reject = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      original: null,
    })
  }, [])

  const reset = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
      original: null,
    })
  }, [])

  return {
    ...state,
    clean,
    accept,
    reject,
    reset,
  }
}
