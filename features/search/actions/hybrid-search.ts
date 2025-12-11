'use server'

import { createClient } from '@/lib/supabase/server'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { embed } from 'ai'
import type { HybridSearchResult } from '../types'

const MAX_RESULTS = 10

export interface HybridSearchOptions {
  limit?: number
  fullTextWeight?: number
  semanticWeight?: number
}

export async function hybridSearch(
  query: string,
  options: HybridSearchOptions = {}
): Promise<HybridSearchResult[]> {
  const { limit = MAX_RESULTS, fullTextWeight = 1.0, semanticWeight = 1.0 } = options

  if (!query.trim()) {
    return []
  }

  const apiKey = process.env.OPENROUTER_API_KEY
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY environment variable is not set')
  }

  const supabase = await createClient()

  // Generate embedding for the query using the same model as note embeddings
  const openrouter = createOpenRouter({ apiKey })
  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
    value: query,
  })

  // Call hybrid_search RPC
  const { data, error } = await supabase.rpc('hybrid_search', {
    query_text: query,
    query_embedding: embedding as unknown as string,
    match_count: limit,
    full_text_weight: fullTextWeight,
    semantic_weight: semanticWeight,
  })

  if (error) {
    console.error('[HybridSearch] RPC error:', error.message)
    throw new Error(`Search failed: ${error.message}`)
  }

  return (data ?? []) as HybridSearchResult[]
}
