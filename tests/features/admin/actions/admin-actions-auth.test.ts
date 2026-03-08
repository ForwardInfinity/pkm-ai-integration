import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ADMIN_ACCESS_REQUIRED_ERROR,
  AUTHENTICATION_REQUIRED_ERROR,
} from '@/features/admin/utils/require-admin'
import { getUsers } from '@/features/admin/actions/get-users'
import {
  getAdminStats,
  getEmbeddingDetails,
} from '@/features/admin/actions/get-admin-stats'
import { updateUserRole } from '@/features/admin/actions/update-user-role'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockUpdate = vi.fn()
const mockEq = vi.fn()
const mockSelect = vi.fn()

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: mockGetUser,
    },
    rpc: mockRpc,
    from: mockFrom,
  })),
}))

function setCurrentUser(user: { id: string } | null) {
  mockGetUser.mockResolvedValue({
    data: { user },
    error: null,
  })
}

function setRpcResponses(
  responses: Record<string, { data: unknown; error: { message: string } | null }>
) {
  mockRpc.mockImplementation((name: string) =>
    Promise.resolve(responses[name] ?? { data: null, error: null })
  )
}

beforeEach(() => {
  vi.clearAllMocks()

  mockFrom.mockImplementation((table: string) => {
    if (table !== 'profiles') {
      throw new Error(`Unexpected table: ${table}`)
    }

    return {
      update: vi.fn((payload: unknown) => {
        mockUpdate(payload)

        return {
          eq: vi.fn((column: string, value: string) => {
            mockEq(column, value)

            return {
              select: vi.fn((query: string) => {
                mockSelect(query)
                return Promise.resolve({
                  data: [{ id: value }],
                  error: null,
                })
              }),
            }
          }),
        }
      }),
    }
  })
})

describe('admin action authorization', () => {
  it('blocks role updates before touching profiles when the caller is not an admin', async () => {
    setCurrentUser({ id: 'user-1' })
    setRpcResponses({
      is_current_user_admin: { data: false, error: null },
    })

    const result = await updateUserRole('user-2', 'admin')

    expect(result).toEqual({
      success: false,
      error: ADMIN_ACCESS_REQUIRED_ERROR,
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('blocks getUsers before calling the admin RPC when the caller is unauthenticated', async () => {
    setCurrentUser(null)
    setRpcResponses({})

    const result = await getUsers()

    expect(result).toEqual({
      success: false,
      error: AUTHENTICATION_REQUIRED_ERROR,
    })
    expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([])
  })

  it('blocks getAdminStats before loading dashboard data when the caller is not an admin', async () => {
    setCurrentUser({ id: 'user-1' })
    setRpcResponses({
      is_current_user_admin: { data: false, error: null },
      get_admin_dashboard_stats: {
        data: [{ total_users: 1 }],
        error: null,
      },
    })

    const result = await getAdminStats()

    expect(result).toEqual({
      success: false,
      error: ADMIN_ACCESS_REQUIRED_ERROR,
    })
    expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
      'is_current_user_admin',
    ])
  })

  it('allows getEmbeddingDetails for admins after the explicit admin check', async () => {
    const recentFailures = [
      {
        id: 'note-1',
        title: 'Failed note',
        error: 'Embedding failed',
        failed_at: '2026-03-08T00:00:00Z',
      },
    ]

    setCurrentUser({ id: 'admin-1' })
    setRpcResponses({
      is_current_user_admin: { data: true, error: null },
      get_admin_embedding_details: {
        data: [
          {
            pending_count: 1,
            processing_count: 2,
            completed_count: 3,
            failed_count: 4,
            total_chunks: 5,
            recent_failures: recentFailures,
          },
        ],
        error: null,
      },
    })

    const result = await getEmbeddingDetails()

    expect(result).toEqual({
      success: true,
      data: {
        pending_count: 1,
        processing_count: 2,
        completed_count: 3,
        failed_count: 4,
        total_chunks: 5,
        recent_failures: recentFailures,
      },
    })
    expect(mockRpc.mock.calls.map(([name]) => name)).toEqual([
      'is_current_user_admin',
      'get_admin_embedding_details',
    ])
  })
})
