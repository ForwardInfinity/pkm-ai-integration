import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCritiqueNote } from '@/features/ai/hooks/use-critique-note'

const mockCritiqueNote = vi.fn()

vi.mock('@/features/ai/actions/critique-note', () => ({
  critiqueNote: (...args: unknown[]) => mockCritiqueNote(...args),
}))

describe('useCritiqueNote', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('initial state', () => {
    it('should start with default values', () => {
      const { result } = renderHook(() => useCritiqueNote())

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
    })
  })

  describe('critique()', () => {
    it('should set loading state when critique is called', async () => {
      mockCritiqueNote.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      const { result } = renderHook(() => useCritiqueNote())

      act(() => {
        result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(true)
    })

    it('should set result on successful critique', async () => {
      const critiqueResult = {
        counterarguments: ['Counter 1'],
        weakLinks: ['Weak 1'],
        hiddenAssumptions: ['Assumption 1'],
        blindspots: ['Blindspot 1'],
      }
      mockCritiqueNote.mockResolvedValueOnce(critiqueResult)

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.result).toEqual(critiqueResult)
      expect(result.current.error).toBeNull()
    })

    it('should set error on failed critique', async () => {
      mockCritiqueNote.mockRejectedValueOnce(new Error('API Error'))

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBe('API Error')
      expect(result.current.result).toBeNull()
    })

    it('should handle non-Error rejection', async () => {
      mockCritiqueNote.mockRejectedValueOnce('string error')

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.error).toBe('Failed to critique note')
    })

    it('should call critiqueNote with correct parameters', async () => {
      mockCritiqueNote.mockResolvedValueOnce({
        counterarguments: [],
        weakLinks: [],
        hiddenAssumptions: [],
        blindspots: [],
      })

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('My Title', 'My Problem', 'My Content')
      })

      expect(mockCritiqueNote).toHaveBeenCalledWith('My Title', 'My Problem', 'My Content')
    })

    it('should clear previous result when critiquing again', async () => {
      const firstResult = {
        counterarguments: ['First'],
        weakLinks: [],
        hiddenAssumptions: [],
        blindspots: [],
      }
      mockCritiqueNote.mockResolvedValueOnce(firstResult)

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.result).toEqual(firstResult)

      // Start a new critique - result should be cleared while loading
      mockCritiqueNote.mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      )

      act(() => {
        result.current.critique('title2', 'problem2', 'content2')
      })

      expect(result.current.result).toBeNull()
      expect(result.current.isLoading).toBe(true)
    })
  })

  describe('dismiss()', () => {
    it('should reset all state', async () => {
      const critiqueResult = {
        counterarguments: ['Counter 1'],
        weakLinks: ['Weak 1'],
        hiddenAssumptions: [],
        blindspots: [],
      }
      mockCritiqueNote.mockResolvedValueOnce(critiqueResult)

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.result).toEqual(critiqueResult)

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.isLoading).toBe(false)
      expect(result.current.error).toBeNull()
      expect(result.current.result).toBeNull()
    })

    it('should clear error state', async () => {
      mockCritiqueNote.mockRejectedValueOnce(new Error('API Error'))

      const { result } = renderHook(() => useCritiqueNote())

      await act(async () => {
        await result.current.critique('title', 'problem', 'content')
      })

      expect(result.current.error).toBe('API Error')

      act(() => {
        result.current.dismiss()
      })

      expect(result.current.error).toBeNull()
    })
  })
})
