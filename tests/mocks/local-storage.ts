import { vi } from 'vitest'

// In-memory localStorage mock
class LocalStorageMock implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store)
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }
}

// In-memory sessionStorage mock
class SessionStorageMock implements Storage {
  private store: Record<string, string> = {}

  get length(): number {
    return Object.keys(this.store).length
  }

  clear(): void {
    this.store = {}
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null
  }

  key(index: number): string | null {
    const keys = Object.keys(this.store)
    return keys[index] ?? null
  }

  removeItem(key: string): void {
    delete this.store[key]
  }

  setItem(key: string, value: string): void {
    this.store[key] = value
  }
}

export const localStorageMock = new LocalStorageMock()
export const sessionStorageMock = new SessionStorageMock()

export function setupStorageMocks() {
  Object.defineProperty(window, 'localStorage', {
    value: localStorageMock,
    writable: true,
  })
  Object.defineProperty(window, 'sessionStorage', {
    value: sessionStorageMock,
    writable: true,
  })
}

export function resetStorageMocks() {
  localStorageMock.clear()
  sessionStorageMock.clear()
}

// Mock BroadcastChannel
export class BroadcastChannelMock {
  name: string
  onmessage: ((event: MessageEvent) => void) | null = null
  
  private static channels: Map<string, Set<BroadcastChannelMock>> = new Map()

  constructor(name: string) {
    this.name = name
    if (!BroadcastChannelMock.channels.has(name)) {
      BroadcastChannelMock.channels.set(name, new Set())
    }
    BroadcastChannelMock.channels.get(name)!.add(this)
  }

  postMessage(message: unknown): void {
    const channels = BroadcastChannelMock.channels.get(this.name)
    if (channels) {
      channels.forEach((channel) => {
        if (channel !== this && channel.onmessage) {
          channel.onmessage(new MessageEvent('message', { data: message }))
        }
      })
    }
  }

  close(): void {
    const channels = BroadcastChannelMock.channels.get(this.name)
    if (channels) {
      channels.delete(this)
    }
  }

  static reset(): void {
    BroadcastChannelMock.channels.clear()
  }
}

export function setupBroadcastChannelMock() {
  vi.stubGlobal('BroadcastChannel', BroadcastChannelMock)
}

export function resetBroadcastChannelMock() {
  BroadcastChannelMock.reset()
}
