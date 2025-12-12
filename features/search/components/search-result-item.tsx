'use client'

import { FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SearchDisplayResult } from '../types'

interface SearchResultItemProps {
  result: SearchDisplayResult
  query: string
  isSelected: boolean
  onClick: () => void
}

// Parse snippet with ** markers from ts_headline and highlight
function renderSnippet(snippet: string): React.ReactNode {
  if (!snippet) return null

  // Split by ** markers (ts_headline format: **matched_text**)
  const parts = snippet.split(/\*\*/)

  return parts.map((part, index) => {
    // Odd indices are matched text (between ** markers)
    if (index % 2 === 1) {
      return (
        <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
          {part}
        </mark>
      )
    }
    return part
  })
}

// Highlight query matches in text (for title)
function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query || !text) return text

  const lowerText = text.toLowerCase()
  const lowerQuery = query.toLowerCase()
  const index = lowerText.indexOf(lowerQuery)

  if (index === -1) return text

  const before = text.slice(0, index)
  const match = text.slice(index, index + query.length)
  const after = text.slice(index + query.length)

  return (
    <>
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded-sm px-0.5">
        {match}
      </mark>
      {after}
    </>
  )
}

export function SearchResultItem({
  result,
  query,
  isSelected,
  onClick,
}: SearchResultItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3 rounded-lg transition-colors border-l-2 border-transparent',
        'hover:bg-accent focus:bg-accent focus:outline-none',
        isSelected && 'bg-accent border-l-primary'
      )}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted/50">
          <FileText className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground truncate">
            {highlightMatch(result.title, query) || 'Untitled'}
          </p>
          {result.problem && (
            <p className="mt-1 text-sm text-muted-foreground line-clamp-1">
              {result.problem}
            </p>
          )}
          {result.snippet && (
            <p className="mt-1.5 text-sm text-muted-foreground/80 line-clamp-2">
              {renderSnippet(result.snippet)}
            </p>
          )}
        </div>
      </div>
    </button>
  )
}
