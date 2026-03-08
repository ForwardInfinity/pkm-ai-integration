'use client'

import { useSyncExternalStore } from 'react'

export const NOTE_ANALYSIS_REFRESH_WINDOW_MS = 20 * 1000
export const NOTE_ANALYSIS_REFRESH_INTERVAL_MS = 5 * 1000

type Listener = () => void

const listeners = new Set<Listener>()
const refreshExpirations = new Map<string, number>()
const cleanupTimers = new Map<string, ReturnType<typeof setTimeout>>()

function notifyListeners() {
  listeners.forEach((listener) => listener())
}

function scheduleCleanup(noteId: string, expiresAt: number) {
  const existingTimer = cleanupTimers.get(noteId)
  if (existingTimer) {
    clearTimeout(existingTimer)
  }

  const delay = Math.max(expiresAt - Date.now(), 0) + 50
  const timer = setTimeout(() => {
    cleanupTimers.delete(noteId)

    const latestExpiry = refreshExpirations.get(noteId)
    if (!latestExpiry || latestExpiry > Date.now()) {
      return
    }

    refreshExpirations.delete(noteId)
    notifyListeners()
  }, delay)

  cleanupTimers.set(noteId, timer)
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function beginNoteAnalysisRefresh(
  noteId: string,
  windowMs = NOTE_ANALYSIS_REFRESH_WINDOW_MS
) {
  if (!noteId) return

  const now = Date.now()
  const currentExpiry = refreshExpirations.get(noteId) ?? 0
  const nextExpiry = Math.max(currentExpiry, now + windowMs)

  refreshExpirations.set(noteId, nextExpiry)
  scheduleCleanup(noteId, nextExpiry)

  if (nextExpiry !== currentExpiry) {
    notifyListeners()
  }
}

export function isNoteAnalysisRefreshing(noteId: string | null) {
  if (!noteId) return false
  return (refreshExpirations.get(noteId) ?? 0) > Date.now()
}

export function isAnyNoteAnalysisRefreshing() {
  const now = Date.now()

  for (const expiresAt of refreshExpirations.values()) {
    if (expiresAt > now) {
      return true
    }
  }

  return false
}

export function useIsNoteAnalysisRefreshing(noteId: string | null) {
  return useSyncExternalStore(
    subscribe,
    () => isNoteAnalysisRefreshing(noteId),
    () => false
  )
}

export function useIsAnyNoteAnalysisRefreshing() {
  return useSyncExternalStore(subscribe, isAnyNoteAnalysisRefreshing, () => false)
}

export function resetNoteAnalysisRefreshState() {
  cleanupTimers.forEach((timer) => clearTimeout(timer))
  cleanupTimers.clear()
  refreshExpirations.clear()
  notifyListeners()
}
