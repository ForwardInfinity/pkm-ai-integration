import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockEmbed = vi.fn()
const mockRpc = vi.fn()
const mockCreateClient = vi.fn()

vi.mock('@openrouter/ai-sdk-provider', () => ({
  createOpenRouter: vi.fn(() => ({
    textEmbeddingModel: vi.fn(() => 'mock-embedding-model'),
  })),
}))

vi.mock('ai', () => ({
  embed: mockEmbed,
}))

vi.mock('@/lib/supabase/server', () => ({
  createClient: mockCreateClient,
}))

describe('hybridSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  describe('validation', () => {
    it('should return empty array for empty query', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      const result = await hybridSearch('')
      expect(result).toEqual([])

      const result2 = await hybridSearch('   ')
      expect(result2).toEqual([])
    })

    it('should throw error when OPENROUTER_API_KEY is not set', async () => {
      vi.stubEnv('OPENROUTER_API_KEY', '')

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await expect(hybridSearch('test query')).rejects.toThrow(
        'OPENROUTER_API_KEY environment variable is not set'
      )
    })
  })

  describe('successful search', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should call embed with query and return search results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })

      const mockResults = [
        {
          id: 'note-1',
          title: 'Test Note',
          problem: 'Test problem',
          content: 'Test content',
          snippet: 'Test **query** snippet',
          match_type: 'hybrid',
          rrf_score: 0.5,
        },
      ]

      mockRpc.mockResolvedValueOnce({ data: mockResults, error: null })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      const result = await hybridSearch('test query')

      expect(mockEmbed).toHaveBeenCalledWith({
        model: 'mock-embedding-model',
        value: 'test query',
      })

      expect(mockRpc).toHaveBeenCalledWith('hybrid_search', {
        query_text: 'test query',
        query_embedding: mockEmbedding,
        match_count: 10,
        full_text_weight: 1.0,
        semantic_weight: 1.0,
        similarity_threshold: 0.3,
      })

      expect(result).toEqual(mockResults)
    })

    it('should respect custom limit option', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })
      mockRpc.mockResolvedValueOnce({ data: [], error: null })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await hybridSearch('test', { limit: 5 })

      expect(mockRpc).toHaveBeenCalledWith('hybrid_search', 
        expect.objectContaining({ match_count: 5 })
      )
    })

    it('should respect custom weight options', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })
      mockRpc.mockResolvedValueOnce({ data: [], error: null })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await hybridSearch('test', {
        fullTextWeight: 2.0,
        semanticWeight: 0.5
      })

      expect(mockRpc).toHaveBeenCalledWith('hybrid_search',
        expect.objectContaining({
          full_text_weight: 2.0,
          semantic_weight: 0.5
        })
      )
    })

    it('should respect custom similarity threshold option', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })
      mockRpc.mockResolvedValueOnce({ data: [], error: null })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await hybridSearch('test', { similarityThreshold: 0.5 })

      expect(mockRpc).toHaveBeenCalledWith('hybrid_search',
        expect.objectContaining({ similarity_threshold: 0.5 })
      )
    })

    it('should use cached embedding for repeated queries', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValue({ embedding: mockEmbedding })
      mockRpc.mockResolvedValue({ data: [], error: null })
      mockCreateClient.mockResolvedValue({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      // First call - should generate embedding
      await hybridSearch('test query')
      expect(mockEmbed).toHaveBeenCalledTimes(1)

      // Second call with same query - should use cache
      await hybridSearch('test query')
      expect(mockEmbed).toHaveBeenCalledTimes(1) // Still 1, not 2

      // Third call with normalized equivalent query - should use cache
      await hybridSearch('  TEST   QUERY  ')
      expect(mockEmbed).toHaveBeenCalledTimes(1) // Still 1

      // Fourth call with different query - should generate new embedding
      await hybridSearch('different query')
      expect(mockEmbed).toHaveBeenCalledTimes(2)
    })

    it('should return empty array when no results', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })
      mockRpc.mockResolvedValueOnce({ data: null, error: null })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      const result = await hybridSearch('nonexistent query')

      expect(result).toEqual([])
    })
  })

  describe('error handling', () => {
    beforeEach(() => {
      vi.stubEnv('OPENROUTER_API_KEY', 'test-api-key')
    })

    it('should throw error on RPC failure', async () => {
      const mockEmbedding = new Array(1536).fill(0.1)
      mockEmbed.mockResolvedValueOnce({ embedding: mockEmbedding })
      mockRpc.mockResolvedValueOnce({ 
        data: null, 
        error: { message: 'Database connection failed' } 
      })
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await expect(hybridSearch('test query')).rejects.toThrow(
        'Search failed: Database connection failed'
      )
    })

    it('should throw error on embedding failure', async () => {
      mockEmbed.mockRejectedValueOnce(new Error('Embedding service unavailable'))
      mockCreateClient.mockResolvedValueOnce({ rpc: mockRpc })

      const { hybridSearch } = await import('@/features/search/actions/hybrid-search')

      await expect(hybridSearch('test query')).rejects.toThrow(
        'Embedding service unavailable'
      )
    })
  })
})
