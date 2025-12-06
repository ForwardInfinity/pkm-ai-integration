'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { nanoid } from 'nanoid'
import { MarkdownEditor } from '@/components/editor'
import { useNote } from '../hooks'
import { useAutoSave } from '../hooks/use-auto-save'
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save'
import { useNoteEditorStore, useTabsActions } from '@/stores'
import { getNoteLocally } from '@/lib/local-db/note-cache'
import { getSyncQueue } from '@/lib/local-db/sync-queue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { LocalNote } from '@/lib/local-db'

interface NoteEditorProps {
  noteId: string
  tabId: string
}

export function NoteEditor({ noteId, tabId }: NoteEditorProps) {
  const isNewNote = noteId === 'new'
  const hasUpdatedUrl = useRef(false)

  // Generate stable local ID for new notes
  const localNoteId = useMemo(() => {
    if (isNewNote) {
      return `temp_${nanoid()}`
    }
    return noteId
  }, [noteId, isNewNote])

  // Data fetching
  const { data: note, isLoading, error } = useNote(noteId)

  // Store for sharing note context with inspector
  const { setCurrentNote, setCurrentNoteId, reset } = useNoteEditorStore()
  
  // Tab management
  const { updateTabTitle, updateTabNoteId } = useTabsActions()

  // Local state for form fields
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [content, setContent] = useState('')
  const [isRecovering, setIsRecovering] = useState(true)

  // Auto-save hook with tab sync
  const { save, getServerId } = useAutoSave({
    noteId: localNoteId,
    onExternalChange: useCallback((data: Partial<LocalNote>) => {
      // Update local state from other tabs
      if (data.title !== undefined) setTitle(data.title)
      if (data.problem !== undefined) setProblem(data.problem ?? '')
      if (data.content !== undefined) setContent(data.content)
    }, []),
  })

  // Beforeunload handler for safety
  useBeforeunloadSave()

  // Check for pending local changes on mount (recovery)
  useEffect(() => {
    async function checkLocalChanges() {
      try {
        const localNote = await getNoteLocally(localNoteId)
        if (localNote && localNote.syncStatus === 'pending') {
          // Recover from local storage
          setTitle(localNote.title)
          setProblem(localNote.problem ?? '')
          setContent(localNote.content)
          // Resume sync queue
          const syncQueue = getSyncQueue()
          syncQueue.enqueue(localNoteId, {
            title: localNote.title,
            problem: localNote.problem,
            content: localNote.content,
            wordCount: localNote.wordCount,
          })
        }
      } catch {
        // Ignore errors - just use server data
      } finally {
        setIsRecovering(false)
      }
    }

    if (!isNewNote) {
      checkLocalChanges()
    } else {
      setIsRecovering(false)
    }
  }, [localNoteId, isNewNote])

  // Initialize form from loaded note and update store
  useEffect(() => {
    if (note && !isNewNote && !isRecovering) {
      // Only set from server if we don't have pending local changes
      getNoteLocally(noteId).then((localNote) => {
        if (!localNote || localNote.syncStatus === 'synced') {
          setTitle(note.title ?? '')
          setProblem(note.problem ?? '')
          setContent(note.content ?? '')
        }
      })
      setCurrentNote(note)
      // Update tab title when note loads
      if (tabId) {
        updateTabTitle(tabId, note.title || 'Untitled')
      }
    } else if (isNewNote) {
      setCurrentNoteId(localNoteId)
    }
  }, [note, isNewNote, isRecovering, noteId, localNoteId, setCurrentNote, setCurrentNoteId, tabId, updateTabTitle])

  // Watch for server ID mapping and update URL (without triggering refetch)
  useEffect(() => {
    if (isNewNote && !hasUpdatedUrl.current) {
      const checkServerId = setInterval(() => {
        const serverId = getServerId(localNoteId)
        if (serverId && !hasUpdatedUrl.current) {
          clearInterval(checkServerId)
          hasUpdatedUrl.current = true
          // Use native history API to avoid Next.js refetch
          window.history.replaceState(null, '', `/notes/${serverId}`)
          // Update tab's noteId from temp to real
          if (tabId) {
            updateTabNoteId(tabId, serverId)
          }
        }
      }, 500)

      return () => clearInterval(checkServerId)
    }
  }, [isNewNote, localNoteId, getServerId, tabId, updateTabNoteId])

  // Cleanup store on unmount
  useEffect(() => {
    return () => {
      reset()
    }
  }, [reset])

  // Calculate word count from content
  const calculateWordCount = useCallback((text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length
  }, [])

  // Handle title change - instant save
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    save({ title: newTitle })
    // Update tab title
    if (tabId) {
      updateTabTitle(tabId, newTitle || 'Untitled')
    }
  }

  // Handle problem change - instant save
  const handleProblemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newProblem = e.target.value
    setProblem(newProblem)
    save({ problem: newProblem || null })
  }

  // Handle reconstruct problem button click (placeholder for AI integration)
  const handleReconstructProblem = () => {
    // TODO: Wire up AI to reconstruct problem from content
    console.log('Reconstruct problem clicked - AI integration coming soon')
  }

  // Handle content save from editor - instant save
  const handleContentSave = useCallback(
    (markdown: string) => {
      setContent(markdown)
      save({
        content: markdown,
        wordCount: calculateWordCount(markdown),
      })
    },
    [save, calculateWordCount]
  )

  // Handle content change (for local state only)
  const handleContentChange = (markdown: string) => {
    setContent(markdown)
  }

  // Loading state
  if (!isNewNote && (isLoading || isRecovering)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (!isNewNote && (error || (!isLoading && !note))) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2">
        <AlertCircle className="h-8 w-8 text-destructive" />
        <p className="text-destructive">Failed to load note</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {/* Editor content */}
      <ScrollArea className="flex-1">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Title input - large and prominent */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            spellCheck={false}
            className="w-full mb-4 text-5xl font-bold leading-[1.1] tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/30 focus:ring-0"
          />

          {/* Problem field - subtle, inline feel */}
          <div className="relative mb-8 pb-2 border-b border-border/40 group hover:border-border/60 focus-within:border-border/60 transition-colors">
            <textarea
              value={problem}
              onChange={handleProblemChange}
              placeholder="What problem does this solve?"
              rows={1}
              spellCheck={false}
              style={{ resize: 'none' }}
              className={cn(
                "w-full bg-transparent",
                "text-base text-muted-foreground",
                "border-none outline-none",
                "placeholder:text-muted-foreground/40 placeholder:italic",
                "focus:ring-0 focus:text-foreground/70",
                "transition-colors duration-200",
                "pr-28"
              )}
            />
            {/* Reconstruct button - inside field, bottom right */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReconstructProblem}
              className={cn(
                "absolute right-0 bottom-2",
                "h-6 px-2",
                "text-xs text-muted-foreground/50 hover:text-foreground hover:bg-muted/50",
                "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                "transition-opacity duration-200"
              )}
            >
              <Sparkles className="h-3 w-3 mr-1" />
              Reconstruct
            </Button>
          </div>

          {/* Content editor */}
          <MarkdownEditor
            content={content}
            placeholder="Start writing your thoughts..."
            onChange={handleContentChange}
            onSave={handleContentSave}
            className="min-h-[400px]"
          />
        </div>
      </ScrollArea>
    </div>
  )
}
