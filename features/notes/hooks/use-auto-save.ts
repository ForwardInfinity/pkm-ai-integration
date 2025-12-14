'use client'

import { useCallback, useEffect, useRef } from 'react'
import { saveNoteLocally, getNoteLocally } from '@/lib/local-db/note-cache'
import { getSyncQueue, NoteChangeListener } from '@/lib/local-db/sync-queue'
import { LocalNote } from '@/lib/local-db'
import { getBrowserQueryClient } from '@/app/providers'
import { noteKeys } from './use-notes'
import type { NoteListItem } from '../types'

interface UseAutoSaveOptions {
  noteId: string
  onExternalChange?: (data: Partial<LocalNote>) => void
}

interface SaveData {
  title?: string
  problem?: string | null
  content?: string
  wordCount?: number
  tags?: string[]
}

export function useAutoSave({ noteId, onExternalChange }: UseAutoSaveOptions) {
  const syncQueueRef = useRef<ReturnType<typeof getSyncQueue> | null>(null)

  // Initialize sync queue
  useEffect(() => {
    syncQueueRef.current = getSyncQueue()
  }, [])

  // Listen for changes from other tabs
  useEffect(() => {
    if (!onExternalChange) return

    const syncQueue = getSyncQueue()
    const listener: NoteChangeListener = (changedNoteId, data) => {
      if (changedNoteId === noteId) {
        onExternalChange(data)
      }
    }

    const unsubscribe = syncQueue.addListener(listener)
    return unsubscribe
  }, [noteId, onExternalChange])

  const save = useCallback(
    async (data: SaveData) => {
      // Get current local state to merge with
      const existing = await getNoteLocally(noteId)

      const localNote: LocalNote = {
        id: noteId,
        title: data.title ?? existing?.title ?? '',
        problem: data.problem !== undefined ? data.problem : (existing?.problem ?? null),
        content: data.content ?? existing?.content ?? '',
        wordCount: data.wordCount ?? existing?.wordCount ?? 0,
        updatedAt: Date.now(),
        syncStatus: 'pending',
        tempId: noteId.startsWith('temp_') ? noteId : undefined,
        serverVersion: existing?.serverVersion,
      }

      // 1. Immediately persist to IndexedDB
      await saveNoteLocally(localNote)

      // 2. Check if we have a server ID mapping (after CREATE sync completed)
      const syncQueue = getSyncQueue()
      const serverId = syncQueue.getServerIdForTempId(noteId)
      const effectiveId = serverId || noteId

      // 3. Optimistically update TanStack Query list cache (instant UI update)
      const queryClient = getBrowserQueryClient()
      if (queryClient) {
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
          if (!old) return old

          // If we have a server ID, filter out any lingering temp entries
          let filtered = old
          if (serverId) {
            filtered = old.filter(n => n.id !== noteId)
          }

          // Find existing note to preserve is_pinned and tags
          const existingIndex = filtered.findIndex(n => n.id === effectiveId)
          const existingNote = existingIndex >= 0 ? filtered[existingIndex] : null

          const updatedEntry: NoteListItem = {
            id: effectiveId,
            title: localNote.title,
            problem: localNote.problem,
            updated_at: new Date().toISOString(),
            word_count: localNote.wordCount,
            // Use provided tags if present, otherwise preserve existing
            tags: data.tags ?? existingNote?.tags ?? [],
            is_pinned: existingNote?.is_pinned ?? false,
          }

          if (existingIndex >= 0) {
            // Update existing - move to top (most recently updated)
            const updated = [...filtered]
            updated.splice(existingIndex, 1)
            return [updatedEntry, ...updated]
          } else {
            // New note - add to top
            return [updatedEntry, ...filtered]
          }
        })
      }

      // 4. Queue for server sync (debounced internally)
      await syncQueue.enqueue(noteId, data)
    },
    [noteId]
  )

  // Get the server ID for a temp ID (after creation)
  const getServerId = useCallback((tempId: string): string | undefined => {
    const syncQueue = getSyncQueue()
    return syncQueue.getServerIdForTempId(tempId)
  }, [])

  return { save, getServerId }
}
