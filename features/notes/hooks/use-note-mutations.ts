'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Note, UpdateNoteInput, CreateNoteInput, NoteListItem } from '../types'
import { noteKeys } from './use-notes'
import { trashKeys } from '@/features/trash/hooks'
import type { TrashNoteItem } from '@/features/trash/types'

// Update note params include the ID
interface UpdateNoteParams extends UpdateNoteInput {
  id: string
}

async function updateNote({ id, ...data }: UpdateNoteParams): Promise<Note> {
  const supabase = createClient()

  const { data: updated, error } = await supabase
    .from('notes')
    .update({
      ...data,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return updated
}

async function createNote(data: CreateNoteInput): Promise<Note> {
  const supabase = createClient()

  // Get the current user's ID
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error('You must be logged in to create a note')
  }

  const { data: created, error } = await supabase
    .from('notes')
    .insert({
      user_id: user.id,
      title: data.title,
      problem: data.problem ?? null,
      content: data.content ?? '',
      tags: data.tags ?? [],
    })
    .select()
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return created
}

async function deleteNote(id: string): Promise<void> {
  const supabase = createClient()

  // Soft delete by setting deleted_at
  const { error } = await supabase
    .from('notes')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    throw new Error(error.message)
  }
}

/**
 * Hook to update a note with optimistic updates
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateNote,
    onMutate: async (newData) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.detail(newData.id) })
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })

      // Snapshot previous values
      const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(newData.id))
      const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.lists())

      // Optimistically update detail cache
      if (previousNote) {
        queryClient.setQueryData<Note>(noteKeys.detail(newData.id), {
          ...previousNote,
          ...newData,
          updated_at: new Date().toISOString(),
        })
      }

      // Optimistically update list cache (for sidebar reactivity)
      queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
        if (!old) return old
        return old.map(n => n.id === newData.id ? {
          ...n,
          ...('title' in newData && { title: newData.title }),
          ...('problem' in newData && { problem: newData.problem }),
          ...('is_pinned' in newData && { is_pinned: newData.is_pinned }),
          ...('tags' in newData && { tags: newData.tags }),
          ...('word_count' in newData && { word_count: newData.word_count }),
        } : n)
      })

      // Return context with previous values for rollback
      return { previousNote, previousNotes }
    },
    onError: (_err, newData, context) => {
      // Rollback on error
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(newData.id), context.previousNote)
      }
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes)
      }
    },
    onSettled: (data) => {
      // Always sync with server data after mutation settles
      if (data) {
        queryClient.setQueryData(noteKeys.detail(data.id), data)
        // Update list cache directly (no invalidation/refetch)
        queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
          if (!old) return old
          return old.map(n => n.id === data.id ? {
            ...n,
            title: data.title,
            problem: data.problem,
            updated_at: data.updated_at,
            word_count: data.word_count,
            is_pinned: data.is_pinned,
            tags: data.tags || [],
          } : n)
        })
      }
    },
  })
}

/**
 * Hook to create a new note
 */
export function useCreateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createNote,
    onSuccess: (data) => {
      // Set the new note in cache
      queryClient.setQueryData(noteKeys.detail(data.id), data)
      // Add to list cache directly (no invalidation/refetch)
      queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
        if (!old) return old
        // Add new note to top of list
        const newEntry: NoteListItem = {
          id: data.id,
          title: data.title,
          problem: data.problem,
          updated_at: data.updated_at,
          word_count: data.word_count,
          tags: data.tags || [],
          is_pinned: data.is_pinned || false,
        }
        return [newEntry, ...old]
      })
    },
  })
}

/**
 * Hook to soft-delete a note with optimistic updates
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNote,
    onMutate: async (id) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: noteKeys.lists() })
      await queryClient.cancelQueries({ queryKey: trashKeys.list() })

      // Snapshot previous states for rollback
      const previousNotes = queryClient.getQueryData<NoteListItem[]>(noteKeys.lists())
      const previousTrash = queryClient.getQueryData<TrashNoteItem[]>(trashKeys.list())

      // Find the note being deleted
      const deletedNote = previousNotes?.find((n) => n.id === id)

      // Optimistically remove from notes list
      queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) =>
        old?.filter((n) => n.id !== id)
      )

      // Optimistically add to trash
      if (deletedNote) {
        const trashItem: TrashNoteItem = {
          id: deletedNote.id,
          title: deletedNote.title,
          problem: deletedNote.problem,
          word_count: deletedNote.word_count,
          deleted_at: new Date().toISOString(),
        }
        queryClient.setQueryData<TrashNoteItem[]>(trashKeys.list(), (old) =>
          old ? [trashItem, ...old] : [trashItem]
        )
      }

      return { previousNotes, previousTrash }
    },
    onError: (_err, _id, context) => {
      // Rollback on error
      if (context?.previousNotes) {
        queryClient.setQueryData(noteKeys.lists(), context.previousNotes)
      }
      if (context?.previousTrash) {
        queryClient.setQueryData(trashKeys.list(), context.previousTrash)
      }
    },
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) })
    },
  })
}
