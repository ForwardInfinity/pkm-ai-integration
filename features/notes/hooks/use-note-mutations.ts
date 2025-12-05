'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Note, UpdateNoteInput, CreateNoteInput } from '../types'
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

  const { data: created, error } = await supabase
    .from('notes')
    .insert({
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
 * Hook to update a note
 */
export function useUpdateNote() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateNote,
    onSuccess: (data) => {
      // Update the detail cache
      queryClient.setQueryData(noteKeys.detail(data.id), data)
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
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
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
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
      // Invalidate list to refetch
      queryClient.invalidateQueries({ queryKey: noteKeys.lists() })
    },
  })
}
