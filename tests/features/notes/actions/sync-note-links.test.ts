import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockFrom = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      auth: {
        getUser: mockGetUser,
      },
      from: mockFrom,
    })
  ),
}))

describe('syncNoteLinks', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-123' } },
      error: null,
    })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'notes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                is: vi.fn(() => ({
                  maybeSingle: vi.fn(() =>
                    Promise.resolve({ data: null, error: null })
                  ),
                })),
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table access: ${table}`)
    })
  })

  it('skips syncing links for trashed source notes', async () => {
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
    expect(mockFrom).not.toHaveBeenCalledWith('note_links')
  })
})
