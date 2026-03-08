import { createClient } from '@/lib/supabase/client'
import {
  getActiveLocalDbUserId,
  getAuthenticatedLocalDbUserId,
  getDB,
  LocalNote,
  setActiveLocalDbUser,
  SyncQueueItem,
} from './index'
import {
  getNoteLocally,
  markNoteConflict,
  markNoteSynced,
  markNoteError,
  updateNoteIdMapping,
  saveIdMapping,
  getIdMapping,
  getAllIdMappings,
  clearCurrentSessionTempDraftId,
  getCurrentSessionTempDraftId,
} from './note-cache'
import { getBrowserQueryClient } from '@/lib/query-client'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { invalidateTagQueries } from '@/features/notes/hooks/use-tags'
import type { NoteListItem, Note } from '@/features/notes/types'
import { triggerEmbeddingGeneration } from '@/features/notes/actions/trigger-embedding'
import { syncNoteLinks } from '@/features/notes/actions/sync-note-links'
import { extractTagsFromMarkdown } from '@/lib/tags'
import { beginNoteAnalysisRefresh } from '@/lib/note-analysis-refresh'
import {
  invalidateAnalysisQueries,
  invalidateBacklinkQueries,
} from '@/lib/note-derived-queries'

const SYNC_DEBOUNCE_MS = 2000
const MAX_RETRIES = 3
const BROADCAST_CHANNEL_NAME_PREFIX = 'refinery-notes-sync'
const TEMP_ID_MAPPING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes
const VERSION_CONFLICT_ERROR = 'VERSION_CONFLICT'
const VERSION_CONFLICT_MESSAGE =
  'This local draft could not sync because the note changed elsewhere. Reload the latest server version and merge your changes manually.'

type NoteChangeListener = (noteId: string, data: Partial<LocalNote>) => void

class VersionConflictError extends Error {
  constructor(
    readonly localNoteId: string,
    readonly currentServerVersion?: string
  ) {
    super(VERSION_CONFLICT_ERROR)
    this.name = 'VersionConflictError'
  }
}

function shouldRefreshDerivedData(item: SyncQueueItem): boolean {
  if (item.operation === 'create') {
    return true
  }

  return (
    item.data.title !== undefined ||
    item.data.problem !== undefined ||
    item.data.content !== undefined
  )
}

class SyncQueue {
  private static readonly QUEUE_LOCK_NAME = 'refinery-sync-queue-lock'
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isProcessing = false
  private listeners: Set<NoteChangeListener> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private tempIdToServerIdMap: Map<string, string> = new Map()
  private activeUserId: string | null = null
  // Lock mechanism to serialize enqueue operations per noteId
  private enqueueLocks: Map<string, Promise<void>> = new Map()
  // Track notes with pending CREATE operations to prevent duplicates
  private pendingCreates: Set<string> = new Set()
  // Track if we've loaded persisted mappings from IndexedDB
  private initialized = false

  constructor() {}

  private resetScope(userId: string | null): void {
    if (this.activeUserId === userId) return

    this.activeUserId = userId
    this.initialized = false
    this.tempIdToServerIdMap.clear()
    this.pendingCreates.clear()

    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }

    if (typeof window !== 'undefined' && userId) {
      this.initBroadcastChannel(userId)
    }
  }

  private async applyUserScope(userId: string | null): Promise<string | null> {
    if (getActiveLocalDbUserId() !== userId) {
      await setActiveLocalDbUser(userId)
    }

    this.resetScope(userId)
    return userId
  }

  private async getRequiredLocalUserId(): Promise<string> {
    const userId =
      getActiveLocalDbUserId() ??
      await getAuthenticatedLocalDbUserId()

    if (!userId) {
      throw new Error('Not authenticated')
    }

    await this.applyUserScope(userId)
    return userId
  }

  private async getAuthenticatedUserScope(): Promise<string | null> {
    const userId = await getAuthenticatedLocalDbUserId()
    return this.applyUserScope(userId)
  }

  private async initialize(): Promise<void> {
    if (this.initialized) return
    // Load persisted mappings from IndexedDB
    const mappings = await getAllIdMappings()
    for (const [tempId, serverId] of mappings) {
      this.tempIdToServerIdMap.set(tempId, serverId)
    }
    this.initialized = true
  }

  private initBroadcastChannel(userId: string): void {
    try {
      this.broadcastChannel = new BroadcastChannel(
        `${BROADCAST_CHANNEL_NAME_PREFIX}-${userId}`
      )
      this.broadcastChannel.onmessage = (event) => {
        const { type, noteId, data, senderId } = event.data
        // Ignore messages from this tab
        if (senderId === this.getTabId()) return

        if (type === 'note-change') {
          // Update local state via listeners
          this.notifyListeners(noteId, data)
        } else if (type === 'id-mapping') {
          // Update in-memory map
          this.tempIdToServerIdMap.set(data.tempId, data.serverId)
          // Persist to IndexedDB (fire-and-forget, don't block message handling)
          saveIdMapping(data.tempId, data.serverId).catch(console.error)
        }
      }
    } catch {
      // BroadcastChannel not supported, fall back to no tab sync
      console.warn('BroadcastChannel not supported, tab sync disabled')
    }
  }

  private getTabId(): string {
    if (typeof window === 'undefined') return ''
    // Use sessionStorage to get a unique tab ID
    let tabId = sessionStorage.getItem('refinery-tab-id')
    if (!tabId) {
      tabId = crypto.randomUUID()
      sessionStorage.setItem('refinery-tab-id', tabId)
    }
    return tabId
  }

  private broadcastChange(noteId: string, data: Partial<LocalNote>): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'note-change',
        noteId,
        data,
        senderId: this.getTabId(),
      })
    }
  }

  private broadcastIdMapping(tempId: string, serverId: string): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: 'id-mapping',
        data: { tempId, serverId },
        senderId: this.getTabId(),
      })
    }
  }

  addListener(listener: NoteChangeListener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners(noteId: string, data: Partial<LocalNote>): void {
    this.listeners.forEach((listener) => listener(noteId, data))
  }

  getServerIdForTempId(tempId: string): string | undefined {
    return this.tempIdToServerIdMap.get(tempId)
  }

  async getFailedItems(): Promise<SyncQueueItem[]> {
    const db = await getDB()
    const items = await db.getAll('syncQueue')
    return items.filter((item) => item.retryCount >= MAX_RETRIES)
  }

  async enqueue(noteId: string, data: Partial<LocalNote>): Promise<void> {
    // Chain operations for the same noteId to prevent race conditions
    const prev = this.enqueueLocks.get(noteId) ?? Promise.resolve()
    const current = prev.catch(() => {}).then(() => this.enqueueInternal(noteId, data))
    this.enqueueLocks.set(noteId, current)
    try {
      await current
    } finally {
      if (this.enqueueLocks.get(noteId) === current) {
        this.enqueueLocks.delete(noteId)
      }
    }
  }

  private async enqueueInternal(noteId: string, data: Partial<LocalNote>): Promise<void> {
    await this.getRequiredLocalUserId()
    await this.initialize()
    const db = await getDB()

    // Check if there's already a pending item for this note
    const existingItems = await db.getAllFromIndex('syncQueue', 'by-note-id', noteId)

    if (existingItems.length > 0) {
      // Update the existing queue item with merged data
      // Reset retryCount and clear lastError to allow reprocessing of failed items
      const existing = existingItems[0]
      await db.put('syncQueue', {
        ...existing,
        data: { ...existing.data, ...data },
        timestamp: Date.now(),
        retryCount: 0,
        lastError: undefined,
      })
    } else {
      // Determine operation: only CREATE if temp_ AND not already created/pending
      const isNewNote = noteId.startsWith('temp_')
      const shouldCreate = isNewNote &&
        !this.tempIdToServerIdMap.has(noteId) &&  // Not already created on server
        !this.pendingCreates.has(noteId)          // Not already pending creation

      if (shouldCreate) {
        this.pendingCreates.add(noteId)  // Mark as pending creation
      }

      await db.add('syncQueue', {
        noteId,
        operation: shouldCreate ? 'create' : 'update',
        data,
        timestamp: Date.now(),
        retryCount: 0,
      })
    }

    // Broadcast to other tabs
    this.broadcastChange(noteId, data)

    // Schedule debounced processing
    this.scheduleProcess()
  }

  private scheduleProcess(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
    }

    this.debounceTimer = setTimeout(() => {
      this.processQueue()
    }, SYNC_DEBOUNCE_MS)
  }

  async processQueue(): Promise<void> {
    const userId = await this.getAuthenticatedUserScope()
    if (!userId) return

    // Skip if already processing in this tab
    if (this.isProcessing) return

    // Use Web Locks API for cross-tab mutual exclusion
    if (typeof navigator !== 'undefined' && navigator.locks) {
      try {
        await navigator.locks.request(
          SyncQueue.QUEUE_LOCK_NAME,
          { ifAvailable: true }, // Non-blocking: skip if another tab holds lock
          async (lock) => {
            if (lock) {
              await this.processQueueInternal(userId)
            }
            // If lock is null, another tab is processing - silently skip
          }
        )
      } catch {
        // Web Locks not available (SSR, older browser) - fallback to local-only lock
        console.debug('Web Locks unavailable, using local lock only')
        await this.processQueueInternal(userId)
      }
    } else {
      // No Web Locks (SSR context) - use local lock only
      await this.processQueueInternal(userId)
    }
  }

  async removeNote(noteId: string): Promise<void> {
    await this.removeNotes([noteId])
  }

  async removeNotes(noteIds: string[]): Promise<void> {
    if (noteIds.length === 0) return

    await this.getRequiredLocalUserId()
    await this.initialize()
    const db = await getDB()
    const relatedNoteIds = new Set(noteIds)
    const tempIdsToRemove = new Set<string>()

    for (const noteId of noteIds) {
      if (noteId.startsWith('temp_')) {
        tempIdsToRemove.add(noteId)

        const mappedServerId =
          this.tempIdToServerIdMap.get(noteId) ?? await getIdMapping(noteId)

        if (mappedServerId) {
          relatedNoteIds.add(mappedServerId)
        }

        continue
      }

      const persistedMappings = await db.getAllFromIndex(
        'idMappings',
        'by-server-id',
        noteId
      )

      for (const mapping of persistedMappings) {
        tempIdsToRemove.add(mapping.tempId)
        relatedNoteIds.add(mapping.tempId)
      }

      for (const [tempId, serverId] of this.tempIdToServerIdMap.entries()) {
        if (serverId === noteId) {
          tempIdsToRemove.add(tempId)
          relatedNoteIds.add(tempId)
        }
      }
    }

    const queueItems = await db.getAll('syncQueue')

    await Promise.all(
      queueItems
        .filter((item) => item.id !== undefined && relatedNoteIds.has(item.noteId))
        .map((item) => db.delete('syncQueue', item.id as number))
    )

    await Promise.all(
      Array.from(relatedNoteIds, (noteId) => db.delete('notes', noteId))
    )

    await Promise.all(
      Array.from(tempIdsToRemove, async (tempId) => {
        this.pendingCreates.delete(tempId)
        this.tempIdToServerIdMap.delete(tempId)
        await db.delete('idMappings', tempId)
      })
    )

    const currentSessionTempDraftId = getCurrentSessionTempDraftId()
    if (currentSessionTempDraftId && relatedNoteIds.has(currentSessionTempDraftId)) {
      clearCurrentSessionTempDraftId()
    }
  }

  private async getCurrentServerNoteState(
    supabase: ReturnType<typeof createClient>,
    noteId: string
  ): Promise<Pick<Note, 'id' | 'updated_at' | 'deleted_at'> | null> {
    const { data, error } = await supabase
      .from('notes')
      .select('id, updated_at, deleted_at')
      .eq('id', noteId)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  }

  private async persistVersionConflict(
    db: Awaited<ReturnType<typeof getDB>>,
    item: SyncQueueItem,
    localNoteId: string,
    currentServerVersion?: string
  ): Promise<void> {
    await markNoteConflict(localNoteId, {
      serverVersion: currentServerVersion,
      message: VERSION_CONFLICT_MESSAGE,
    })

    if (item.id !== undefined) {
      await db.put('syncQueue', {
        ...item,
        lastError: VERSION_CONFLICT_ERROR,
      })
    }
  }

  private async processQueueInternal(expectedUserId: string): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const currentUserId = await this.getAuthenticatedUserScope()
      if (!currentUserId || currentUserId !== expectedUserId) {
        return
      }

      await this.initialize()
      const db = await getDB()
      const items = await db.getAll('syncQueue')

      for (const item of items) {
        const currentItem =
          item.id !== undefined ? await db.get('syncQueue', item.id) : item

        if (!currentItem) {
          continue
        }

        // Skip items that have already permanently failed
        if (currentItem.lastError) continue

        try {
          await this.processItem(currentItem, expectedUserId)
          // Remove from queue on success
          if (currentItem.id !== undefined) {
            await db.delete('syncQueue', currentItem.id)
          }
        } catch (error) {
          if (error instanceof VersionConflictError) {
            const persistedItem =
              currentItem.id !== undefined
                ? await db.get('syncQueue', currentItem.id)
                : currentItem

            if (!persistedItem) {
              continue
            }

            await this.persistVersionConflict(
              db,
              persistedItem,
              error.localNoteId,
              error.currentServerVersion
            )
            continue
          }

          // Handle both Error instances and Supabase error objects ({ message: string })
          const errorMessage =
            error instanceof Error
              ? error.message
              : typeof error === 'object' &&
                  error !== null &&
                  'message' in error
                ? String((error as { message: unknown }).message)
                : String(error)

          // Special handling for unmapped temp IDs - time-boxed deferral
          if (errorMessage === 'TEMP_ID_NOT_MAPPED') {
            const persistedItem =
              currentItem.id !== undefined
                ? await db.get('syncQueue', currentItem.id)
                : currentItem

            if (!persistedItem) {
              continue
            }

            const ageMs = Date.now() - persistedItem.timestamp

            if (ageMs > TEMP_ID_MAPPING_TIMEOUT_MS) {
              // Mapping never arrived - mark as permanent failure
              console.error('TEMP_ID_NOT_MAPPED timeout for:', persistedItem.noteId, `(${Math.round(ageMs / 1000)}s old)`)
              await markNoteError(persistedItem.noteId)
              await db.put('syncQueue', {
                ...persistedItem,
                lastError: 'TEMP_ID_NOT_MAPPED_TIMEOUT',
              })
            } else {
              // Still within timeout window - keep for later retry
              console.debug('Deferring sync for unmapped temp ID:', persistedItem.noteId, `(${Math.round(ageMs / 1000)}s old)`)
            }
            continue
          }

          const persistedItem =
            currentItem.id !== undefined
              ? await db.get('syncQueue', currentItem.id)
              : currentItem

          if (!persistedItem) {
            continue
          }

          console.error('Sync error for note:', persistedItem.noteId, error)
          // Increment retry count
          if (persistedItem.retryCount < MAX_RETRIES) {
            await db.put('syncQueue', {
              ...persistedItem,
              retryCount: persistedItem.retryCount + 1,
            })
          } else {
            // Mark note and queue item as error (keep for potential recovery)
            await markNoteError(persistedItem.noteId)
            await db.put('syncQueue', {
              ...persistedItem,
              lastError: errorMessage,
            })
          }
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async processItem(item: SyncQueueItem, userId: string): Promise<void> {
    const supabase = createClient()

    if (item.operation === 'create') {
      // Re-check if another tab already created this note
      const existingServerId = await getIdMapping(item.noteId)
      if (existingServerId) {
        // Another tab completed the create - skip and let the delete logic handle cleanup
        this.tempIdToServerIdMap.set(item.noteId, existingServerId)
        this.pendingCreates.delete(item.noteId)
        console.debug('Skipping CREATE - already created by another tab:', item.noteId, '->', existingServerId)
        return // Success - item will be deleted from queue by caller
      }

      // Create new note on server
      const localNote = await getNoteLocally(item.noteId)
      if (!localNote) return

      const { data: created, error } = await supabase
        .from('notes')
        .insert({
          user_id: userId,
          title: localNote.title || 'Untitled',
          problem: localNote.problem,
          content: localNote.content || '',
          word_count: localNote.wordCount || 0,
          tags: item.data.tags ?? [],
        })
        .select()
        .single()

      if (error) throw error

      // Update local ID mapping (persist to IDB for cross-session reliability)
      await updateNoteIdMapping(item.noteId, created.id)
      this.tempIdToServerIdMap.set(item.noteId, created.id)
      await saveIdMapping(item.noteId, created.id)
      this.broadcastIdMapping(item.noteId, created.id)

      // Clear from pendingCreates since creation succeeded
      this.pendingCreates.delete(item.noteId)

      await markNoteSynced(created.id, created.updated_at)

      // Update TanStack Query cache - replace temp entry with server entry
      const queryClient = getBrowserQueryClient()
      if (queryClient) {
        // Update list cache - replace temp ID with server data
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
          if (!old) return old
          return old.map(n => n.id === item.noteId ? {
            id: created.id,
            title: created.title,
            problem: created.problem,
            updated_at: created.updated_at,
            word_count: created.word_count,
            tags: created.tags || [],
            is_pinned: created.is_pinned || false,
          } : n)
        })
        // Set detail cache for the new note
        queryClient.setQueryData<Note>(noteKeys.detail(created.id), created)
      }

      // Trigger embedding generation for new note (best-effort, does not block sync)
      triggerEmbeddingGeneration({
        id: created.id,
        title: created.title,
        problem: created.problem,
        content: created.content,
      })
        .then((res) => {
          if (!res.success) {
            console.error('[Embedding] Failed to enqueue for new note:', res.error)
          } else if (!res.skipped) {
            beginNoteAnalysisRefresh(created.id)

            const queryClient = getBrowserQueryClient()
            if (queryClient) {
              void invalidateAnalysisQueries(queryClient)
            }
          }
        })
        .catch(console.error)

      // Sync note links for backlinks (best-effort)
      syncNoteLinks(created.id, created.content || '')
        .then((res) => {
          if (!res.success) {
            console.error('[NoteLinks] Failed to sync for new note:', res.error)
          } else {
            // Invalidate backlinks cache for any notes that were linked
            const queryClient = getBrowserQueryClient()
            if (queryClient) {
              void invalidateBacklinkQueries(queryClient)
            }
          }
        })
        .catch(console.error)

      // Invalidate tags cache if tags were added
      if (item.data.tags && item.data.tags.length > 0) {
        const queryClient = getBrowserQueryClient()
        if (queryClient) {
          void invalidateTagQueries(queryClient)
        }
      }
    } else {
      // Update existing note
      let serverNoteId = item.noteId

      // Check if this was originally a temp ID
      if (item.noteId.startsWith('temp_')) {
        let mappedId = this.tempIdToServerIdMap.get(item.noteId)

        // If not in memory, try loading from IndexedDB (may have arrived late)
        if (!mappedId) {
          mappedId = await getIdMapping(item.noteId)
          if (mappedId) {
            this.tempIdToServerIdMap.set(item.noteId, mappedId)
          }
        }

        if (mappedId) {
          serverNoteId = mappedId
        } else {
          // Mapping not available yet - throw special error to KEEP item in queue
          // This prevents silent data loss when mapping hasn't arrived yet
          throw new Error('TEMP_ID_NOT_MAPPED')
        }
      }

      const localNote =
        await getNoteLocally(serverNoteId) ??
        (serverNoteId !== item.noteId ? await getNoteLocally(item.noteId) : undefined)
      const localNoteId = localNote?.id ?? serverNoteId
      const expectedServerVersion = localNote?.serverVersion

      if (!expectedServerVersion) {
        const currentServerNote = await this.getCurrentServerNoteState(
          supabase,
          serverNoteId
        )

        if (!currentServerNote || currentServerNote.deleted_at) {
          console.debug('Skipping sync for trashed or missing note:', serverNoteId)
          await this.removeNotes([serverNoteId])
          return
        }

        throw new VersionConflictError(localNoteId, currentServerNote.updated_at)
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (item.data.title !== undefined) updateData.title = item.data.title
      if (item.data.problem !== undefined) updateData.problem = item.data.problem
      if (item.data.content !== undefined) updateData.content = item.data.content
      if (item.data.wordCount !== undefined) updateData.word_count = item.data.wordCount
      if (item.data.tags !== undefined) updateData.tags = item.data.tags

      const { data: updated, error } = await supabase
        .from('notes')
        .update(updateData)
        .eq('id', serverNoteId)
        .eq('updated_at', expectedServerVersion)
        .is('deleted_at', null)
        .select()
        .maybeSingle()

      if (error) throw error

      if (!updated) {
        const currentServerNote = await this.getCurrentServerNoteState(
          supabase,
          serverNoteId
        )

        if (!currentServerNote || currentServerNote.deleted_at) {
          console.debug('Skipping sync for trashed or missing note:', serverNoteId)
          await this.removeNotes([serverNoteId])
          return
        }

        if (currentServerNote.updated_at !== expectedServerVersion) {
          throw new VersionConflictError(localNoteId, currentServerNote.updated_at)
        }

        throw new Error(`Failed to update note: ${serverNoteId}`)
      }

      await markNoteSynced(serverNoteId, updated.updated_at)

      // Update TanStack Query cache - silently update with server data
      const queryClient = getBrowserQueryClient()
      if (queryClient) {
        // Update list cache entry - preserve is_pinned and tags (not sent in update)
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
          if (!old) return old
          return old.map(n => n.id === serverNoteId ? {
            ...n,
            title: updated.title,
            problem: updated.problem,
            updated_at: updated.updated_at,
            word_count: updated.word_count,
            // Preserve is_pinned and tags from existing cache (these aren't in update payload)
          } : n)
        })
        // Update detail cache
        queryClient.setQueryData<Note>(noteKeys.detail(serverNoteId), updated)
      }

      const shouldRefreshAnalysis = shouldRefreshDerivedData(item)

      // Trigger embedding regeneration for updated note (best-effort, does not block sync)
      triggerEmbeddingGeneration({
        id: updated.id,
        title: updated.title,
        problem: updated.problem,
        content: updated.content,
      })
        .then((res) => {
          if (!res.success) {
            console.error('[Embedding] Failed to enqueue for updated note:', res.error)
          } else if (shouldRefreshAnalysis && !res.skipped) {
            beginNoteAnalysisRefresh(updated.id)

            const queryClient = getBrowserQueryClient()
            if (queryClient) {
              void invalidateAnalysisQueries(queryClient)
            }
          }
        })
        .catch(console.error)

      // Sync note links for backlinks when content changes (best-effort)
      if (item.data.content !== undefined) {
        syncNoteLinks(updated.id, updated.content || '')
          .then((res) => {
            if (!res.success) {
              console.error('[NoteLinks] Failed to sync for updated note:', res.error)
            } else {
              // Invalidate backlinks cache for any notes that were linked/unlinked
              const queryClient = getBrowserQueryClient()
              if (queryClient) {
                void invalidateBacklinkQueries(queryClient)
              }
            }
          })
          .catch(console.error)
      }

      // Invalidate tags cache if tags were updated
      if (item.data.tags !== undefined) {
        const queryClient = getBrowserQueryClient()
        if (queryClient) {
          void invalidateTagQueries(queryClient)
        }
      }
    }
  }

  async flushSync(): Promise<void> {
    // Clear any pending debounce
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }

    // Process immediately
    await this.processQueue()
  }

  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer)
      this.debounceTimer = null
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
      this.broadcastChannel = null
    }
    this.activeUserId = null
    this.initialized = false
    this.pendingCreates.clear()
    this.tempIdToServerIdMap.clear()
  }
}

// Singleton instance
let syncQueueInstance: SyncQueue | null = null

function buildRecoveredNotePayload(note: LocalNote): Partial<LocalNote> {
  return {
    title: note.title,
    problem: note.problem,
    content: note.content,
    wordCount: note.wordCount,
    tags: note.tags ?? extractTagsFromMarkdown(note.content),
  }
}

export function getSyncQueue(): SyncQueue {
  if (typeof window === 'undefined') {
    throw new Error('SyncQueue is only available in the browser')
  }
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue()
  }
  return syncQueueInstance
}

export async function requeueRecoveredNote(note: LocalNote): Promise<void> {
  const syncQueue = getSyncQueue()
  await syncQueue.enqueue(note.id, buildRecoveredNotePayload(note))
}

export async function resumeSyncQueueOnStartup(): Promise<void> {
  const userId = await getAuthenticatedLocalDbUserId()
  if (!userId) {
    return
  }

  await setActiveLocalDbUser(userId)
  const syncQueue = getSyncQueue()
  await syncQueue.flushSync()
}

export function resetSyncQueue(): void {
  if (syncQueueInstance) {
    syncQueueInstance.destroy()
    syncQueueInstance = null
  }
}

export type { NoteChangeListener }
