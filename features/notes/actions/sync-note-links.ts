'use server'

import { createClient } from '@/lib/supabase/server'
import { extractUniqueLinkTitles } from '@/lib/link-parser'
import {
  buildNormalizedNoteTitleLookup,
  normalizeNoteTitle,
} from '@/lib/note-title-lookup'

interface SyncNoteLinksResult {
  success: boolean
  linksCreated: number
  linksDeleted: number
  skipped?: boolean
  reason?: string
  error?: string
}

async function fetchActiveNoteTitleRecords(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string
) {
  return supabase
    .from('notes')
    .select('id, title, updated_at')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false })
}

/**
 * Syncs the note_links table based on wikilinks found in note content
 * This should be called after a note is saved to keep backlinks up to date
 */
export async function syncNoteLinks(
  sourceNoteId: string,
  content: string
): Promise<SyncNoteLinksResult> {
  const supabase = await createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return { success: false, linksCreated: 0, linksDeleted: 0, error: 'Not authenticated' }
  }

  try {
    const { data: sourceNote, error: sourceNoteError } = await supabase
      .from('notes')
      .select('id')
      .eq('id', sourceNoteId)
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle()

    if (sourceNoteError) {
      return { success: false, linksCreated: 0, linksDeleted: 0, error: sourceNoteError.message }
    }

    if (!sourceNote) {
      return {
        success: true,
        linksCreated: 0,
        linksDeleted: 0,
        skipped: true,
        reason: 'Source note is trashed',
      }
    }

    // Extract unique link titles from content
    const linkTitles = extractUniqueLinkTitles(content)

    // If no links, just delete all existing links from this note
    if (linkTitles.length === 0) {
      const { error: deleteError } = await supabase
        .from('note_links')
        .delete()
        .eq('source_note_id', sourceNoteId)
        .eq('user_id', user.id)

      if (deleteError) {
        return { success: false, linksCreated: 0, linksDeleted: 0, error: deleteError.message }
      }

      return { success: true, linksCreated: 0, linksDeleted: 0 }
    }

    const { data: targetNotes, error: notesError } = await fetchActiveNoteTitleRecords(
      supabase,
      user.id
    )

    if (notesError) {
      return { success: false, linksCreated: 0, linksDeleted: 0, error: notesError.message }
    }

    const titleToId = buildNormalizedNoteTitleLookup(targetNotes ?? [], {
      excludeNoteId: sourceNoteId,
    })

    const targetNoteIds = Array.from(
      new Set(
        linkTitles
          .map((title) => titleToId.get(normalizeNoteTitle(title))?.id)
          .filter((id): id is string => id !== undefined)
      )
    )

    // Get existing links from this source note
    const { data: existingLinks, error: existingError } = await supabase
      .from('note_links')
      .select('id, target_note_id')
      .eq('source_note_id', sourceNoteId)
      .eq('user_id', user.id)

    if (existingError) {
      return { success: false, linksCreated: 0, linksDeleted: 0, error: existingError.message }
    }

    const existingTargetIds = new Set(
      (existingLinks || []).map((link) => link.target_note_id)
    )
    const newTargetIds = new Set(targetNoteIds)

    // Find links to create (in new but not in existing)
    const linksToCreate = targetNoteIds.filter((id) => !existingTargetIds.has(id))

    // Find links to delete (in existing but not in new)
    const linksToDelete = (existingLinks || [])
      .filter((link) => !newTargetIds.has(link.target_note_id))
      .map((link) => link.id)

    let linksCreated = 0
    let linksDeleted = 0

    // Create new links
    if (linksToCreate.length > 0) {
      const { error: insertError } = await supabase.from('note_links').insert(
        linksToCreate.map((targetId) => ({
          user_id: user.id,
          source_note_id: sourceNoteId,
          target_note_id: targetId,
        }))
      )

      if (insertError) {
        console.error('Error creating note links:', insertError)
      } else {
        linksCreated = linksToCreate.length
      }
    }

    // Delete removed links
    if (linksToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('note_links')
        .delete()
        .in('id', linksToDelete)

      if (deleteError) {
        console.error('Error deleting note links:', deleteError)
      } else {
        linksDeleted = linksToDelete.length
      }
    }

    return { success: true, linksCreated, linksDeleted }
  } catch (error) {
    console.error('Error syncing note links:', error)
    return {
      success: false,
      linksCreated: 0,
      linksDeleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Resolves note titles to note IDs
 * Returns a map of title -> id for notes that exist
 */
export async function resolveNoteTitles(
  titles: string[]
): Promise<Map<string, string>> {
  if (titles.length === 0) return new Map()

  const supabase = await createClient()

  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError || !user) {
    return new Map()
  }

  const { data: notes, error } = await fetchActiveNoteTitleRecords(supabase, user.id)

  if (error || !notes) {
    return new Map()
  }

  const lookup = buildNormalizedNoteTitleLookup(notes)
  const titleToId = new Map<string, string>()

  for (const title of titles) {
    const match = lookup.get(normalizeNoteTitle(title))
    if (match) {
      titleToId.set(normalizeNoteTitle(title), match.id)
    }
  }

  return titleToId
}
