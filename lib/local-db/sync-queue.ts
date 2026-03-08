import { createClient } from '@/lib/supabase/client'
import { getDB, LocalNote, SyncQueueItem } from './index'
import {
  getNoteLocally,
  markNoteSynced,
  markNoteError,
  updateNoteIdMapping,
  saveIdMapping,
  getIdMapping,
  getAllIdMappings,
} from './note-cache'
import { getBrowserQueryClient } from '@/lib/query-client'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import { backlinkKeys } from '@/features/notes/hooks/use-backlinks'
import { tagKeys } from '@/features/notes/hooks/use-tags'
import type { NoteListItem, Note } from '@/features/notes/types'
import { triggerEmbeddingGeneration } from '@/features/notes/actions/trigger-embedding'
import { syncNoteLinks } from '@/features/notes/actions/sync-note-links'
import { extractTagsFromMarkdown } from '@/lib/tags'

const SYNC_DEBOUNCE_MS = 2000
const MAX_RETRIES = 3
const BROADCAST_CHANNEL_NAME = 'refinery-notes-sync'
const TEMP_ID_MAPPING_TIMEOUT_MS = 5 * 60 * 1000 // 5 minutes

type NoteChangeListener = (noteId: string, data: Partial<LocalNote>) => void

class SyncQueue {
  private static readonly QUEUE_LOCK_NAME = 'refinery-sync-queue-lock'
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isProcessing = false
  private listeners: Set<NoteChangeListener> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private tempIdToServerIdMap: Map<string, string> = new Map()
  // Lock mechanism to serialize enqueue operations per noteId
  private enqueueLocks: Map<string, Promise<void>> = new Map()
  // Track notes with pending CREATE operations to prevent duplicates
  private pendingCreates: Set<string> = new Set()
  // Track if we've loaded persisted mappings from IndexedDB
  private initialized = false

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBroadcastChannel()
    }
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

  private initBroadcastChannel(): void {
    try {
      this.broadcastChannel = new BroadcastChannel(BROADCAST_CHANNEL_NAME)
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
              await this.processQueueInternal()
            }
            // If lock is null, another tab is processing - silently skip
          }
        )
      } catch {
        // Web Locks not available (SSR, older browser) - fallback to local-only lock
        console.debug('Web Locks unavailable, using local lock only')
        await this.processQueueInternal()
      }
    } else {
      // No Web Locks (SSR context) - use local lock only
      await this.processQueueInternal()
    }
  }

  private async processQueueInternal(): Promise<void> {
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      await this.initialize()
      const db = await getDB()
      const items = await db.getAll('syncQueue')

      for (const item of items) {
        // Skip items that have already permanently failed
        if (item.lastError) continue

        try {
          await this.processItem(item)
          // Remove from queue on success
          if (item.id !== undefined) {
            await db.delete('syncQueue', item.id)
          }
        } catch (error) {
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
            const ageMs = Date.now() - item.timestamp

            if (ageMs > TEMP_ID_MAPPING_TIMEOUT_MS) {
              // Mapping never arrived - mark as permanent failure
              console.error('TEMP_ID_NOT_MAPPED timeout for:', item.noteId, `(${Math.round(ageMs / 1000)}s old)`)
              await markNoteError(item.noteId)
              await db.put('syncQueue', {
                ...item,
                lastError: 'TEMP_ID_NOT_MAPPED_TIMEOUT',
              })
            } else {
              // Still within timeout window - keep for later retry
              console.debug('Deferring sync for unmapped temp ID:', item.noteId, `(${Math.round(ageMs / 1000)}s old)`)
            }
            continue
          }

          console.error('Sync error for note:', item.noteId, error)
          // Increment retry count
          if (item.retryCount < MAX_RETRIES) {
            await db.put('syncQueue', {
              ...item,
              retryCount: item.retryCount + 1,
            })
          } else {
            // Mark note and queue item as error (keep for potential recovery)
            await markNoteError(item.noteId)
            await db.put('syncQueue', {
              ...item,
              lastError: errorMessage,
            })
          }
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  private async processItem(item: SyncQueueItem): Promise<void> {
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
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const localNote = await getNoteLocally(item.noteId)
      if (!localNote) return

      const { data: created, error } = await supabase
        .from('notes')
        .insert({
          user_id: user.id,
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
              queryClient.invalidateQueries({ queryKey: backlinkKeys.all })
            }
          }
        })
        .catch(console.error)

      // Invalidate tags cache if tags were added
      if (item.data.tags && item.data.tags.length > 0) {
        const queryClient = getBrowserQueryClient()
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: tagKeys.tags() })
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
        .select()
        .single()

      if (error) throw error

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
                queryClient.invalidateQueries({ queryKey: backlinkKeys.all })
              }
            }
          })
          .catch(console.error)
      }

      // Invalidate tags cache if tags were updated
      if (item.data.tags !== undefined) {
        const queryClient = getBrowserQueryClient()
        if (queryClient) {
          queryClient.invalidateQueries({ queryKey: tagKeys.tags() })
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
    }
    if (this.broadcastChannel) {
      this.broadcastChannel.close()
    }
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
  const syncQueue = getSyncQueue()
  await syncQueue.flushSync()
}

export type { NoteChangeListener }
