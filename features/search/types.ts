// Search-related type definitions

export interface SearchResult {
  id: string;
  title: string;
  problem: string | null;
  content_snippet: string;
  relevance_score: number;
}

export interface SearchQuery {
  query: string;
  limit?: number;
  offset?: number;
}

// Hybrid search result from database RPC
export interface HybridSearchResult {
  id: string;
  title: string;
  problem: string | null;
  content: string;
  snippet: string;
  match_type: 'keyword' | 'semantic' | 'hybrid';
  rrf_score: number;
}

// Transformed result for UI display
export interface SearchDisplayResult {
  id: string;
  title: string;
  problem: string | null;
  snippet: string;
  matchType: 'keyword' | 'semantic' | 'hybrid';
  score: number;
}
