import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: (...args: unknown[]) => mockCreateClient(...args),
}))

interface MockQueryResult<T> {
  data: T
  error: { message: string } | null
}

interface MockSyncNoteLinksClientOptions {
  sourceNoteResult?: MockQueryResult<{ id: string } | null>
  noteCandidatesResult?: MockQueryResult<
    Array<{ id: string; title: string; updated_at: string }>
  >
  existingLinksResult?: MockQueryResult<
    Array<{ id: string; target_note_id: string }>
  >
  insertError?: { message: string } | null
  deleteAllError?: { message: string } | null
  deleteByIdsError?: { message: string } | null
}

function createMockSyncNoteLinksClient(
  options: MockSyncNoteLinksClientOptions = {}
) {
  const insertSpy = vi.fn(async () => ({ error: options.insertError ?? null }))
  const deleteByIdsSpy = vi.fn(async () => ({
    error: options.deleteByIdsError ?? null,
  }))

  const deleteAllByUserSpy = vi.fn(async () => ({
    error: options.deleteAllError ?? null,
  }))

  const notesTable = {
    select: vi.fn((columns: string) => {
      if (columns === 'id') {
        return {
          eq: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn(async () =>
                  options.sourceNoteResult ?? { data: null, error: null }
                ),
              })),
            })),
          })),
        }
      }

      if (columns === 'id, title, updated_at') {
        return {
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              order: vi.fn(async () =>
                options.noteCandidatesResult ?? { data: [], error: null }
              ),
            })),
          })),
        }
      }

      throw new Error(`Unexpected notes select columns: ${columns}`)
    }),
  }

  const noteLinksTable = {
    delete: vi.fn(() => ({
      eq: vi.fn((field: string) => {
        if (field !== 'source_note_id') {
          throw new Error(`Unexpected delete eq field: ${field}`)
        }

        return {
          eq: deleteAllByUserSpy,
        }
      }),
      in: deleteByIdsSpy,
    })),
    insert: insertSpy,
    select: vi.fn((columns: string) => {
      if (columns !== 'id, target_note_id') {
        throw new Error(`Unexpected note_links select columns: ${columns}`)
      }

      return {
        eq: vi.fn((field: string) => {
          if (field !== 'source_note_id') {
            throw new Error(`Unexpected select eq field: ${field}`)
          }

          return {
            eq: vi.fn(async () =>
              options.existingLinksResult ?? { data: [], error: null }
            ),
          }
        }),
      }
    }),
  }

  return {
    auth: {
      getUser: mockGetUser,
    },
    from: vi.fn((table: string) => {
      if (table === 'notes') return notesTable
      if (table === 'note_links') return noteLinksTable
      throw new Error(`Unexpected table access: ${table}`)
    }),
    spies: {
      insertSpy,
      deleteAllByUserSpy,
      deleteByIdsSpy,
    },
  }
}

describe('syncNoteLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
  })

  it('skips syncing links for trashed source notes', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSyncNoteLinksClient({
        sourceNoteResult: { data: null, error: null },
      })
    )

    const { syncNoteLinks } = await import(
      '@/features/notes/actions/sync-note-links'
    )

    const result = await syncNoteLinks('note-123', '[[Another note]]')

    expect(result).toMatchObject({
      success: true,
      skipped: true,
      reason: 'Source note is trashed',
      linksCreated: 0,
      linksDeleted: 0,
    })
  })

  it('creates backlinks using normalized title matching', async () => {
    const client = createMockSyncNoteLinksClient({
      sourceNoteResult: { data: { id: 'note-source' }, error: null },
      noteCandidatesResult: {
        data: [
          {
            id: 'note-target',
            title: 'Foo',
            updated_at: '2026-03-08T10:00:00Z',
          },
        ],
        error: null,
      },
      existingLinksResult: { data: [], error: null },
    })

    mockCreateClient.mockResolvedValue(client)

    const { syncNoteLinks } = await import(
      '@/features/notes/actions/sync-note-links'
    )

    const result = await syncNoteLinks('note-source', 'See [[foo]] and [[Foo]].')

    expect(result).toMatchObject({
      success: true,
      linksCreated: 1,
      linksDeleted: 0,
    })
    expect(client.spies.insertSpy).toHaveBeenCalledWith([
      {
        user_id: 'user-123',
        source_note_id: 'note-source',
        target_note_id: 'note-target',
      },
    ])
  })

  it('excludes self-links from persisted backlinks', async () => {
    const client = createMockSyncNoteLinksClient({
      sourceNoteResult: { data: { id: 'note-source' }, error: null },
      noteCandidatesResult: {
        data: [
          {
            id: 'note-source',
            title: 'Foo',
            updated_at: '2026-03-08T10:00:00Z',
          },
        ],
        error: null,
      },
      existingLinksResult: { data: [], error: null },
    })

    mockCreateClient.mockResolvedValue(client)

    const { syncNoteLinks } = await import(
      '@/features/notes/actions/sync-note-links'
    )

    const result = await syncNoteLinks('note-source', 'See [[foo]].')

    expect(result).toMatchObject({
      success: true,
      linksCreated: 0,
      linksDeleted: 0,
    })
    expect(client.spies.insertSpy).not.toHaveBeenCalled()
  })
})
