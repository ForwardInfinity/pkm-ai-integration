'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Note, UpdateNoteInput, CreateNoteInput, NoteListItem } from '../types'
import { noteKeys } from './use-notes'

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

      // Snapshot the previous value
      const previousNote = queryClient.getQueryData<Note>(noteKeys.detail(newData.id))

      // Optimistically update the cache
      if (previousNote) {
        queryClient.setQueryData<Note>(noteKeys.detail(newData.id), {
          ...previousNote,
          ...newData,
          updated_at: new Date().toISOString(),
        })
      }

      // Return context with the previous value
      return { previousNote }
    },
    onError: (_err, newData, context) => {
      // Rollback on error
      if (context?.previousNote) {
        queryClient.setQueryData(noteKeys.detail(newData.id), context.previousNote)
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
 * Hook to soft-delete a note
 */
export function useDeleteNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNote,
    onSuccess: (_, id) => {
      // Remove from detail cache
      queryClient.removeQueries({ queryKey: noteKeys.detail(id) })
      // Remove from list cache directly (no invalidation/refetch)
      queryClient.setQueryData<NoteListItem[]>(noteKeys.lists(), (old) => {
        if (!old) return old
        return old.filter(n => n.id !== id)
      })
    },
  })
}
