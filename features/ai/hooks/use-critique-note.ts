'use client'

import { useState, useCallback } from 'react'
import { critiqueNote } from '../actions/critique-note'
import type { CritiqueResult } from '../types'

interface UseCritiqueNoteState {
  isLoading: boolean
  error: string | null
  result: CritiqueResult | null
}

interface UseCritiqueNoteReturn extends UseCritiqueNoteState {
  critique: (title: string, problem: string, content: string) => Promise<void>
  dismiss: () => void
}

export function useCritiqueNote(): UseCritiqueNoteReturn {
  const [state, setState] = useState<UseCritiqueNoteState>({
    isLoading: false,
    error: null,
    result: null,
  })

  const critique = useCallback(async (title: string, problem: string, content: string) => {
    setState({
      isLoading: true,
      error: null,
      result: null,
    })

    try {
      const result = await critiqueNote(title, problem, content)
      setState({
        isLoading: false,
        error: null,
        result,
      })
    } catch (err) {
      setState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to critique note',
        result: null,
      })
    }
  }, [])

  const dismiss = useCallback(() => {
    setState({
      isLoading: false,
      error: null,
      result: null,
    })
  }, [])

  return {
    ...state,
    critique,
    dismiss,
  }
}
