import { createClient } from '@/lib/supabase/client'
import { getDB, LocalNote, SyncQueueItem } from './index'
import {
  getNoteLocally,
  markNoteSynced,
  markNoteError,
  updateNoteIdMapping,
} from './note-cache'
import { getBrowserQueryClient } from '@/app/providers'
import { noteKeys } from '@/features/notes/hooks/use-notes'
import type { NoteListItem, Note } from '@/features/notes/types'

const SYNC_DEBOUNCE_MS = 2000
const MAX_RETRIES = 3
const BROADCAST_CHANNEL_NAME = 'refinery-notes-sync'

type NoteChangeListener = (noteId: string, data: Partial<LocalNote>) => void

class SyncQueue {
  private debounceTimer: ReturnType<typeof setTimeout> | null = null
  private isProcessing = false
  private listeners: Set<NoteChangeListener> = new Set()
  private broadcastChannel: BroadcastChannel | null = null
  private tempIdToServerIdMap: Map<string, string> = new Map()
  // Lock mechanism to serialize enqueue operations per noteId
  private enqueueLocks: Map<string, Promise<void>> = new Map()
  // Track notes with pending CREATE operations to prevent duplicates
  private pendingCreates: Set<string> = new Set()

  constructor() {
    if (typeof window !== 'undefined') {
      this.initBroadcastChannel()
    }
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
          // Update temp ID mapping
          this.tempIdToServerIdMap.set(data.tempId, data.serverId)
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
    const db = await getDB()

    // Check if there's already a pending item for this note
    const existingItems = await db.getAllFromIndex('syncQueue', 'by-note-id', noteId)

    if (existingItems.length > 0) {
      // Update the existing queue item with merged data
      const existing = existingItems[0]
      await db.put('syncQueue', {
        ...existing,
        data: { ...existing.data, ...data },
        timestamp: Date.now(),
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
    if (this.isProcessing) return
    this.isProcessing = true

    try {
      const db = await getDB()
      const items = await db.getAll('syncQueue')

      for (const item of items) {
        try {
          await this.processItem(item)
          // Remove from queue on success
          if (item.id !== undefined) {
            await db.delete('syncQueue', item.id)
          }
        } catch (error) {
          console.error('Sync error for note:', item.noteId, error)
          // Increment retry count
          if (item.retryCount < MAX_RETRIES) {
            await db.put('syncQueue', {
              ...item,
              retryCount: item.retryCount + 1,
            })
          } else {
            // Mark as error and remove from queue
            await markNoteError(item.noteId)
            if (item.id !== undefined) {
              await db.delete('syncQueue', item.id)
            }
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
        })
        .select()
        .single()

      if (error) throw error

      // Update local ID mapping
      await updateNoteIdMapping(item.noteId, created.id)
      this.tempIdToServerIdMap.set(item.noteId, created.id)
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
    } else {
      // Update existing note
      let serverNoteId = item.noteId

      // Check if this was originally a temp ID
      if (item.noteId.startsWith('temp_')) {
        const mappedId = this.tempIdToServerIdMap.get(item.noteId)
        if (mappedId) {
          serverNoteId = mappedId
        } else {
          // Note hasn't been created yet, skip this update
          // It will be handled when the create completes
          return
        }
      }

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      }

      if (item.data.title !== undefined) updateData.title = item.data.title
      if (item.data.problem !== undefined) updateData.problem = item.data.problem
      if (item.data.content !== undefined) updateData.content = item.data.content
      if (item.data.wordCount !== undefined) updateData.word_count = item.data.wordCount

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

export function getSyncQueue(): SyncQueue {
  if (typeof window === 'undefined') {
    throw new Error('SyncQueue is only available in the browser')
  }
  if (!syncQueueInstance) {
    syncQueueInstance = new SyncQueue()
  }
  return syncQueueInstance
}

export type { NoteChangeListener }
