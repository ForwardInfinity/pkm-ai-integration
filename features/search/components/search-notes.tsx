'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import { useSearchNotes } from '../hooks'
import { SearchResultItem } from './search-result-item'
import { useTabsActions } from '@/stores'

export function SearchNotes() {
  const router = useRouter()
  const { openTab } = useTabsActions()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const { results, isLoading, hasQuery } = useSearchNotes(query)

  useEffect(() => {
    setSelectedIndex(0)
  }, [results])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    setIsOpen(false)
    setQuery('')
    setSelectedIndex(0)
  }, [])

  const handleSelect = useCallback(
    (id: string, title: string) => {
      openTab(id, title || 'Untitled', true)
      router.push(`/notes/${id}`)
      handleClose()
    },
    [openTab, router, handleClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose()
        return
      }

      if (!hasQuery || results.length === 0) return

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault()
          setSelectedIndex((prev) => (prev + 1) % results.length)
          break
        case 'ArrowUp':
          e.preventDefault()
          setSelectedIndex((prev) => (prev - 1 + results.length) % results.length)
          break
        case 'Enter':
          e.preventDefault()
          const selected = results[selectedIndex]
          if (selected) {
            handleSelect(selected.id, selected.title)
          }
          break
      }
    },
    [hasQuery, results, selectedIndex, handleSelect, handleClose]
  )

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          <Search className="h-4 w-4" />
          <span>Search notes...</span>
        </button>
      </DialogTrigger>
      <DialogContent
        className="top-[15%] translate-y-0 max-w-2xl gap-0 p-0 [&>button]:hidden"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <VisuallyHidden>
          <DialogTitle>Search Notes</DialogTitle>
        </VisuallyHidden>
        <div className="flex h-[500px] flex-col">
          <div className="flex items-center border-b px-4">
            <Search className="h-5 w-5 shrink-0 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search notes..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              className="h-14 border-0 px-4 text-base shadow-none focus-visible:ring-0"
            />
          </div>

          <div className="flex-1 overflow-hidden">
            {hasQuery ? (
              isLoading ? (
                <div className="flex h-full items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  No notes found for &quot;{query}&quot;
                </div>
              ) : (
                <div className="flex h-full flex-col">
                  <div className="shrink-0 px-4 py-2 text-xs text-muted-foreground">
                    Found {results.length} {results.length === 1 ? 'note' : 'notes'}
                  </div>
                  <ScrollArea className="flex-1">
                    <div className="flex flex-col gap-1 p-2">
                      {results.map((result, index) => (
                        <SearchResultItem
                          key={result.id}
                          result={result}
                          query={query}
                          isSelected={index === selectedIndex}
                          onClick={() => handleSelect(result.id, result.title)}
                        />
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                Type to search across all notes
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
