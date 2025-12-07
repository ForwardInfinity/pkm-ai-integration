import { vi } from 'vitest'

// Mock Supabase client for testing
export const mockSupabaseClient = {
  auth: {
    getUser: vi.fn().mockResolvedValue({
      data: { user: { id: 'test-user-id', email: 'test@example.com' } },
      error: null,
    }),
    signInWithPassword: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
  },
  from: vi.fn(() => ({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn(),
  })),
}

// Mock the createClient function
export const createClientMock = vi.fn(() => mockSupabaseClient)

// Helper to reset all mocks
export function resetSupabaseMocks() {
  vi.clearAllMocks()
  mockSupabaseClient.auth.getUser.mockResolvedValue({
    data: { user: { id: 'test-user-id', email: 'test@example.com' } },
    error: null,
  })
}

// Helper to mock a successful query
export function mockSupabaseQuery(tableName: string, data: unknown) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data, error: null }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockSupabaseClient.from as any).mockImplementation((table: string) => {
    if (table === tableName) {
      return chainMock
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (mockSupabaseClient.from as any)(table)
  })
  return chainMock
}

// Helper to mock a query error
export function mockSupabaseError(tableName: string, errorMessage: string) {
  const chainMock = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue({ data: null, error: { message: errorMessage } }),
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(mockSupabaseClient.from as any).mockImplementation((table: string) => {
    if (table === tableName) {
      return chainMock
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (mockSupabaseClient.from as any)(table)
  })
  return chainMock
}
