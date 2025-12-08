import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCleanNote } from '@/features/ai/hooks/use-clean-note'

const mockCleanNote = vi.fn()

vi.mock('@/features/ai/actions/clean-note', () => ({
  cleanNote: (...args: unknown[]) => mockCleanNote(...args),
}))

describe('useCleanNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with default values', () => {
      const { result } = renderHook(() => useCleanNote())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
      expect(result.current.original).toBeNull()
    })
  })

  describe('clean()', () => {
    it('should set loading state when clean is called', async () => {
      mockCleanNote.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useCleanNote())

      act(() => {
        result.current.clean('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should store original values when clean is called', async () => {
      mockCleanNote.mockResolvedValueOnce({
        title: 'cleaned',
        problem: 'cleaned',
        content: 'cleaned',
      })

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('Original Title', 'Original Problem', 'Original Content')
      })

      expect(result.current.original).toEqual({
        title: 'Original Title',
        problem: 'Original Problem',
        content: 'Original Content',
      })
    })

    it('should set result on successful clean', async () => {
      const cleanedNote = {
        title: 'Cleaned Title',
        problem: 'Cleaned Problem',
        content: 'Cleaned Content',
      }
      mockCleanNote.mockResolvedValueOnce(cleanedNote)

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.result).toEqual(cleanedNote)
      expect(result.current.error).toBeNull()
    })

    it('should set error on failed clean', async () => {
      mockCleanNote.mockRejectedValueOnce(new Error('API Error'))

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('API Error')
      expect(result.current.result).toBeNull()
    })

    it('should handle non-Error rejection', async () => {
      mockCleanNote.mockRejectedValueOnce('string error')

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      expect(result.current.error).toBe('Failed to clean note')
    })

    it('should call cleanNote with correct parameters', async () => {
      mockCleanNote.mockResolvedValueOnce({
        title: '',
        problem: '',
        content: '',
      })

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('My Title', 'My Problem', 'My Content')
      })

      expect(mockCleanNote).toHaveBeenCalledWith('My Title', 'My Problem', 'My Content')
    })
  })

  describe('accept()', () => {
    it('should return the result', async () => {
      const cleanedNote = {
        title: 'Cleaned',
        problem: 'Cleaned',
        content: 'Cleaned',
      }
      mockCleanNote.mockResolvedValueOnce(cleanedNote)

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      let accepted: ReturnType<typeof result.current.accept>
      act(() => {
        accepted = result.current.accept()
      })

      expect(accepted!).toEqual(cleanedNote)
    })

    it('should reset state after accept', async () => {
      mockCleanNote.mockResolvedValueOnce({
        title: 'Cleaned',
        problem: 'Cleaned',
        content: 'Cleaned',
      })

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      act(() => {
        result.current.accept()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
      expect(result.current.original).toBeNull()
    })

    it('should return null when no result exists', () => {
      const { result } = renderHook(() => useCleanNote())

      let accepted: ReturnType<typeof result.current.accept>
      act(() => {
        accepted = result.current.accept()
      })

      expect(accepted!).toBeNull()
    })
  })

  describe('reject()', () => {
    it('should reset all state', async () => {
      mockCleanNote.mockResolvedValueOnce({
        title: 'Cleaned',
        problem: 'Cleaned',
        content: 'Cleaned',
      })

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      act(() => {
        result.current.reject()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
      expect(result.current.original).toBeNull()
    })
  })

  describe('reset()', () => {
    it('should clear all state', async () => {
      mockCleanNote.mockRejectedValueOnce(new Error('Error'))

      const { result } = renderHook(() => useCleanNote())

      await act(async () => {
        await result.current.clean('title', 'problem', 'content')
      })

      expect(result.current.error).toBe('Error')

      act(() => {
        result.current.reset()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
      expect(result.current.original).toBeNull()
    })
  })
})
