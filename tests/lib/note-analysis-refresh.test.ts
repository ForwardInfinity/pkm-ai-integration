import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  beginNoteAnalysisRefresh,
  isAnyNoteAnalysisRefreshing,
  isNoteAnalysisRefreshing,
  NOTE_ANALYSIS_REFRESH_WINDOW_MS,
  resetNoteAnalysisRefreshState,
} from '@/lib/note-analysis-refresh'

describe('note-analysis-refresh', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    resetNoteAnalysisRefreshState()
  })

  afterEach(() => {
    resetNoteAnalysisRefreshState()
    vi.useRealTimers()
  })

  it('tracks refresh windows per note and expires them automatically', async () => {
    beginNoteAnalysisRefresh('note-123')

    expect(isNoteAnalysisRefreshing('note-123')).toBe(true)
    expect(isAnyNoteAnalysisRefreshing()).toBe(true)

    await vi.advanceTimersByTimeAsync(NOTE_ANALYSIS_REFRESH_WINDOW_MS + 100)

    expect(isNoteAnalysisRefreshing('note-123')).toBe(false)
    expect(isAnyNoteAnalysisRefreshing()).toBe(false)
  })

  it('extends an existing refresh window when a newer sync completes', async () => {
    beginNoteAnalysisRefresh('note-123', 5_000)
    await vi.advanceTimersByTimeAsync(4_000)

    beginNoteAnalysisRefresh('note-123', 5_000)
    await vi.advanceTimersByTimeAsync(2_000)

    expect(isNoteAnalysisRefreshing('note-123')).toBe(true)

    await vi.advanceTimersByTimeAsync(3_100)

    expect(isNoteAnalysisRefreshing('note-123')).toBe(false)
  })
})
