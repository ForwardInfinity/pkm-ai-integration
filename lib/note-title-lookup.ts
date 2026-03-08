export interface NoteTitleCandidate {
  id: string
  title: string
}

interface NoteTitleLookupOptions {
  excludeNoteId?: string
}

export function normalizeNoteTitle(title: string): string {
  return title.trim().toLowerCase()
}

export function buildNormalizedNoteTitleLookup<T extends NoteTitleCandidate>(
  notes: readonly T[],
  options: NoteTitleLookupOptions = {}
): Map<string, T> {
  const lookup = new Map<string, T>()

  for (const note of notes) {
    if (options.excludeNoteId && note.id === options.excludeNoteId) {
      continue
    }

    const normalizedTitle = normalizeNoteTitle(note.title)
    if (!lookup.has(normalizedTitle)) {
      lookup.set(normalizedTitle, note)
    }
  }

  return lookup
}

export function resolveNoteByTitle<T extends NoteTitleCandidate>(
  notes: readonly T[],
  title: string,
  options: NoteTitleLookupOptions = {}
): T | undefined {
  const lookup = buildNormalizedNoteTitleLookup(notes, options)
  return lookup.get(normalizeNoteTitle(title))
}
