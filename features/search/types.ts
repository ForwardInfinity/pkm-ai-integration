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
