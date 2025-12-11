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
import { Loader2, AlertCircle, Sparkles, Check, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoteActionsDropdown } from './note-actions-dropdown'
import { useReconstructProblem, useCleanNote, CleanDiffTitle, CleanDiffField, CleanDiffContent, CleanNoteActionBar, CleanNotePreviewModal } from '@/features/ai'
import '@/components/editor/editor-styles.css'
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

  // AI problem reconstruction
  const {
    isLoading: isReconstructing,
    currentSuggestion,
    showAlternatives,
    reconstruct,
    fetchAlternatives,
    selectAlternative,
    reset: resetAI,
    result: aiResult,
  } = useReconstructProblem()

  // AI clean note
  const {
    isLoading: isCleaning,
    error: cleanError,
    result: cleanResult,
    original: cleanOriginal,
    clean: cleanNote,
    accept: acceptClean,
    reject: rejectClean,
  } = useCleanNote()

  // Clean note review mode (when we have results to review)
  const isInCleanReviewMode = !isCleaning && cleanResult !== null && cleanOriginal !== null

  // Preview modal state
  const [showPreview, setShowPreview] = useState(false)

  // Refs for auto-expanding textareas
  const suggestionTextareaRef = useRef<HTMLTextAreaElement>(null)
  const problemTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize suggestion textarea based on content
  useEffect(() => {
    if (suggestionTextareaRef.current && currentSuggestion) {
      suggestionTextareaRef.current.style.height = 'auto'
      suggestionTextareaRef.current.style.height = `${suggestionTextareaRef.current.scrollHeight}px`
    }
  }, [currentSuggestion])

  // Auto-resize problem textarea based on content
  useEffect(() => {
    if (problemTextareaRef.current) {
      problemTextareaRef.current.style.height = 'auto'
      problemTextareaRef.current.style.height = `${problemTextareaRef.current.scrollHeight}px`
    }
  }, [problem])

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

  // Handle reconstruct problem button click
  const handleReconstructProblem = async () => {
    if (!content.trim() && !title.trim()) return
    await reconstruct(content, title)
  }

  // Accept AI suggestion
  const handleAcceptSuggestion = () => {
    if (currentSuggestion) {
      setProblem(currentSuggestion)
      save({ problem: currentSuggestion })
      resetAI()
    }
  }

  // Fetch alternatives when "Try Another" is clicked
  const handleTryAnother = async () => {
    await fetchAlternatives(content, title)
  }

  // Select an alternative from the list
  const handleSelectAlternative = (index: number) => {
    selectAlternative(index)
  }

  // Clear AI suggestion when user types manually
  const handleProblemChangeWithAIClear = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newProblem = e.target.value
    setProblem(newProblem)
    save({ problem: newProblem || null })
    if (currentSuggestion) {
      resetAI()
    }
  }

  // Handle clean note button click
  const handleCleanNote = async () => {
    await cleanNote(title, problem, content)
  }

  // Accept cleaned note
  const handleAcceptClean = () => {
    const cleaned = acceptClean()
    if (cleaned) {
      setTitle(cleaned.title)
      setProblem(cleaned.problem)
      setContent(cleaned.content)
      save({
        title: cleaned.title,
        problem: cleaned.problem || null,
        content: cleaned.content,
        wordCount: calculateWordCount(cleaned.content),
      })
      if (tabId) {
        updateTabTitle(tabId, cleaned.title || 'Untitled')
      }
    }
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
        <div
          className={cn(
            "relative max-w-3xl mx-auto px-8 pt-12 pb-12",
            isCleaning && "note-cleaning"
          )}
        >
          {/* Actions - top right */}
          {!isNewNote && note && (
            <div className="absolute top-4 right-4 flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleCleanNote}
                disabled={isCleaning || (!content.trim() && !title.trim())}
                className="h-8 px-3 text-xs text-muted-foreground hover:text-foreground"
              >
                {isCleaning ? (
                  <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                )}
                Clean
              </Button>
              <NoteActionsDropdown
                noteId={note.id}
                title={title}
                isPinned={note.is_pinned}
              />
            </div>
          )}

          {/* Title input - large and prominent */}
          {isInCleanReviewMode ? (
            <div className="w-full mb-6">
              <CleanDiffTitle
                original={cleanOriginal.title}
                cleaned={cleanResult.title}
              />
            </div>
          ) : (
            <input
              type="text"
              value={title}
              onChange={handleTitleChange}
              placeholder="Untitled"
              spellCheck={false}
              disabled={isCleaning}
              className={cn(
                "w-full mb-6 text-4xl md:text-5xl font-bold leading-tight tracking-tight bg-transparent border-none outline-none placeholder:text-muted-foreground/30 focus:ring-0",
                isCleaning && "opacity-70"
              )}
            />
          )}

          {/* Problem field - subtle, inline feel */}
          <div className="relative mb-8 pb-2 border-b border-border/40 group hover:border-border/60 focus-within:border-border/60 transition-colors">
            {isInCleanReviewMode ? (
              // Clean review mode - show diff
              <CleanDiffField
                original={cleanOriginal.problem}
                cleaned={cleanResult.problem}
                placeholder="What problem does this solve?"
              />
            ) : currentSuggestion ? (
              // AI suggestion mode
              <div className="space-y-3">
                <textarea
                  ref={suggestionTextareaRef}
                  value={currentSuggestion}
                  onChange={handleProblemChangeWithAIClear}
                  spellCheck={false}
                  style={{ resize: 'none', minHeight: '2.5rem', overflow: 'hidden' }}
                  className={cn(
                    "w-full bg-primary/5 rounded-md p-2",
                    "text-base text-foreground/80",
                    "border border-primary/20 outline-none",
                    "focus:ring-1 focus:ring-primary/30",
                    "transition-colors duration-200"
                  )}
                />
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleAcceptSuggestion}
                    className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-50"
                  >
                    <Check className="h-3 w-3 mr-1" />
                    Accept
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleTryAnother}
                    disabled={isReconstructing}
                    className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  >
                    {isReconstructing ? (
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Try Another
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetAI}
                    className="h-7 px-2 text-xs text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-3 w-3 mr-1" />
                    Dismiss
                  </Button>
                </div>

                {/* Multiple-choice alternatives */}
                {showAlternatives && aiResult?.alternatives && aiResult.alternatives.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <p className="text-xs text-muted-foreground">Choose an alternative:</p>
                    {aiResult.alternatives.map((alt, index) => (
                      <button
                        key={index}
                        type="button"
                        onClick={() => handleSelectAlternative(index)}
                        className={cn(
                          "w-full text-left p-3 rounded-md",
                          "bg-muted/30 hover:bg-muted/50",
                          "border border-border/40 hover:border-border/60",
                          "text-sm text-foreground/80",
                          "transition-colors duration-150",
                          "focus:outline-none focus:ring-1 focus:ring-primary/30"
                        )}
                      >
                        {alt}
                      </button>
                    ))}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleTryAnother}
                      disabled={isReconstructing}
                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      {isReconstructing ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3 mr-1" />
                      )}
                      More alternatives
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              // Normal mode
              <>
                <textarea
                  ref={problemTextareaRef}
                  value={problem}
                  onChange={handleProblemChangeWithAIClear}
                  placeholder="What problem does this solve?"
                  spellCheck={false}
                  disabled={isCleaning}
                  style={{ resize: 'none', minHeight: '1.5rem', overflow: 'hidden' }}
                  className={cn(
                    "w-full bg-transparent",
                    "text-base text-muted-foreground",
                    "border-none outline-none",
                    "placeholder:text-muted-foreground/40 placeholder:italic",
                    "focus:ring-0 focus:text-foreground/70",
                    "transition-colors duration-200",
                    "pr-28",
                    isCleaning && "opacity-70"
                  )}
                />
                {/* Reconstruct button - inside field, bottom right */}
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleReconstructProblem}
                  disabled={isReconstructing || (!content.trim() && !title.trim())}
                  className={cn(
                    "absolute right-0 bottom-2",
                    "h-6 px-2",
                    "text-xs text-muted-foreground/50 hover:text-foreground hover:bg-muted/50",
                    "opacity-0 group-hover:opacity-100 group-focus-within:opacity-100",
                    "transition-opacity duration-200",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {isReconstructing ? (
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3 mr-1" />
                  )}
                  Reconstruct
                </Button>
              </>
            )}
          </div>

          {/* Content editor */}
          {isInCleanReviewMode ? (
            <CleanDiffContent
              original={cleanOriginal.content}
              cleaned={cleanResult.content}
              className="min-h-[400px]"
            />
          ) : (
            <MarkdownEditor
              content={content}
              placeholder="Start writing your thoughts..."
              onChange={handleContentChange}
              onSave={handleContentSave}
              className={cn("min-h-[400px]", isCleaning && "opacity-70 pointer-events-none")}
              editable={!isCleaning}
            />
          )}
        </div>
      </ScrollArea>

      {/* Clean Note Action Bar */}
      <CleanNoteActionBar
        visible={isInCleanReviewMode}
        onAccept={handleAcceptClean}
        onReject={rejectClean}
        onPreview={() => setShowPreview(true)}
      />

      {/* Clean Note Preview Modal */}
      {isInCleanReviewMode && (
        <CleanNotePreviewModal
          open={showPreview}
          onOpenChange={setShowPreview}
          original={{
            title: cleanOriginal.title,
            problem: cleanOriginal.problem,
            content: cleanOriginal.content,
          }}
          cleaned={{
            title: cleanResult.title,
            problem: cleanResult.problem,
            content: cleanResult.content,
          }}
          onAccept={handleAcceptClean}
          onReject={rejectClean}
        />
      )}

      {/* Clean Note Error Toast */}
      {cleanError && (
        <div
          role="alert"
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-destructive/90 text-destructive-foreground rounded-lg shadow-lg text-sm animate-in slide-in-from-bottom-4 fade-in"
        >
          {cleanError}
        </div>
      )}
    </div>
  )
}
