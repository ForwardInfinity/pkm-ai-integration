import '@testing-library/jest-dom'
import { vi, beforeEach, afterEach } from 'vitest'
import { setupStorageMocks, resetStorageMocks, setupBroadcastChannelMock, resetBroadcastChannelMock } from './mocks/local-storage'

// Setup storage mocks
setupStorageMocks()
setupBroadcastChannelMock()

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  usePathname: () => '/notes',
  useSearchParams: () => new URLSearchParams(),
}))

// Mock nanoid for predictable IDs in tests - use global counter for reset
const nanoidState = { counter: 0 }
vi.mock('nanoid', () => ({
  nanoid: () => `test-id-${++nanoidState.counter}`,
}))

// Reset mocks between tests
beforeEach(() => {
  resetStorageMocks()
  resetBroadcastChannelMock()
  nanoidState.counter = 0
})

afterEach(() => {
  vi.clearAllMocks()
})
