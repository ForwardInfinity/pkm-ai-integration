'use client'

import { useState, useEffect, useCallback, useMemo, useRef, useLayoutEffect } from 'react'
import { nanoid } from 'nanoid'
import { MarkdownEditor } from '@/components/editor'
import { useNote, useNotes } from '../hooks'
import { useAllTags } from '../hooks/use-tags'
import { useAutoSave } from '../hooks/use-auto-save'
import { useBeforeunloadSave } from '@/hooks/use-beforeunload-save'
import { useNoteEditorActions, useTabsActions, useActiveTabId } from '@/stores'
import {
  clearCurrentSessionTempDraftId,
  getCurrentSessionTempDraftId,
  getNoteLocally,
  setCurrentSessionTempDraftId,
} from '@/lib/local-db/note-cache'
import { requeueRecoveredNote } from '@/lib/local-db/sync-queue'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Loader2, AlertCircle, Sparkles, Check, X, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { NoteActionsDropdown } from './note-actions-dropdown'
import { useReconstructProblem, useCleanNote, CleanDiffTitle, CleanDiffField, CleanDiffContent, CleanNoteActionBar, CleanNotePreviewModal } from '@/features/ai'
import '@/components/editor/editor-styles.css'
import type { LocalNote } from '@/lib/local-db'
import type { WikiLinkConfig, HashTagConfig } from '@/components/editor/types'
import { useRouter } from 'next/navigation'
import { extractTagsFromMarkdown } from '@/lib/tags'
import { isUnsavedNoteId } from '../utils/note-id'

interface NoteEditorProps {
  noteId: string
  tabId: string
}

function isRecoverableLocalDraft(
  localNote: LocalNote | undefined
): localNote is LocalNote {
  return !!localNote &&
    (localNote.syncStatus === 'pending' || localNote.syncStatus === 'error')
}

export function NoteEditor({ noteId, tabId }: NoteEditorProps) {
  const isNewNote = noteId === 'new'
  const isUnsavedNote = isUnsavedNoteId(noteId)
  const hasUpdatedUrl = useRef(false)

  const sessionTempDraftId = useMemo(() => {
    if (!isNewNote) return null
    return getCurrentSessionTempDraftId()
  }, [isNewNote])

  const generatedTempNoteId = useMemo(() => {
    if (!isNewNote) return noteId
    return `temp_${nanoid()}`
  }, [noteId, isNewNote])

  const [resolvedTempNoteId, setResolvedTempNoteId] = useState<string | null>(null)
  const localNoteId = isNewNote
    ? resolvedTempNoteId ?? sessionTempDraftId ?? generatedTempNoteId
    : noteId

  // Data fetching
  const { data: note, isLoading, error } = useNote(noteId)

  // Store for sharing the active draft with the inspector
  const {
    hydrateFromServer,
    setDraftPatch,
    setCurrentDraftId,
    reset,
  } = useNoteEditorActions()

  // Tab management
  const { updateTabTitle, updateTabNoteId, openTab } = useTabsActions()
  const activeTabId = useActiveTabId()
  const isActiveTab = tabId === activeTabId

  // Notes list for wikilink autocomplete
  const { data: allNotes } = useNotes()

  // All tags for hashtag autocomplete
  const { data: allTags } = useAllTags()

  // Router for tag click navigation
  const router = useRouter()

  // Use ref to always get fresh notes data in callbacks
  const allNotesRef = useRef(allNotes)
  useEffect(() => {
    allNotesRef.current = allNotes
  }, [allNotes])

  // Use ref for tags data
  const allTagsRef = useRef(allTags)
  useEffect(() => {
    allTagsRef.current = allTags
  }, [allTags])

  // WikiLink configuration for the editor
  // Using ref ensures getNotes always returns current data even after editor initialization
  const wikiLinkConfig = useMemo<WikiLinkConfig | undefined>(() => {
    return {
      getNotes: () =>
        (allNotesRef.current ?? []).map((n) => ({
          id: n.id,
          title: n.title,
          problem: n.problem,
        })),
      onWikiLinkClick: (noteTitle: string) => {
        // Find the note by title using fresh data from ref
        const notes = allNotesRef.current ?? []
        const targetNote = notes.find(
          (n) => n.title.toLowerCase() === noteTitle.toLowerCase()
        )
        if (targetNote) {
          openTab(targetNote.id, targetNote.title, true)
        }
      },
    }
  }, [openTab])

  // HashTag configuration for the editor
  const hashTagConfig = useMemo<HashTagConfig | undefined>(() => {
    return {
      getTags: () =>
        (allTagsRef.current ?? []).map((t) => ({
          tag: t.tag,
          count: t.count,
        })),
      onHashTagClick: (tag: string) => {
        // Navigate to notes list filtered by tag
        router.push(`/notes?tag=${encodeURIComponent(tag)}`)
      },
    }
  }, [router])

  // Local state for form fields
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [content, setContent] = useState('')
  const [isRecovering, setIsRecovering] = useState(true)

  // Draft bookkeeping for the shared inspector state
  const latestDraftRef = useRef({ title: '', problem: '', content: '' })
  const hasRecoveredLocalDraftRef = useRef(false)

  // Calculate word count from content
  const calculateWordCount = useCallback((text: string) => {
    return text.trim().split(/\s+/).filter(Boolean).length
  }, [])

  const recoverLocalDraft = useCallback(async (localNote: LocalNote) => {
    hasRecoveredLocalDraftRef.current = true
    setTitle(localNote.title)
    setProblem(localNote.problem ?? '')
    setContent(localNote.content)
    await requeueRecoveredNote(localNote)
  }, [])

  useEffect(() => {
    latestDraftRef.current = { title, problem, content }
  }, [title, problem, content])

  useEffect(() => {
    setResolvedTempNoteId(null)
  }, [noteId])

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

      if (!isActiveTab) {
        return
      }

      const nextContent = data.content ?? latestDraftRef.current.content
      const nextTags = data.tags ?? extractTagsFromMarkdown(nextContent)

      setDraftPatch(
        {
          ...(data.title !== undefined ? { title: data.title } : {}),
          ...(data.problem !== undefined ? { problem: data.problem ?? '' } : {}),
          ...(data.content !== undefined ? { content: data.content } : {}),
          ...(data.content !== undefined || data.tags !== undefined ? { tags: nextTags } : {}),
          ...(data.wordCount !== undefined
            ? { wordCount: data.wordCount }
            : data.content !== undefined
              ? { wordCount: calculateWordCount(nextContent) }
              : {}),
        },
        tabId
      )
    }, [calculateWordCount, isActiveTab, setDraftPatch, tabId]),
  })

  const syncActiveDraftToStore = useCallback(
    (override?: {
      id?: string
      persistedId?: string | null
      source?: 'server' | 'local-draft'
      isPinned?: boolean
    }) => {
      if (!isActiveTab) return

      const draft = latestDraftRef.current
      const persistedId =
        override?.persistedId ?? (isUnsavedNote ? null : note?.id ?? noteId)
      const currentDraftId = override?.id ?? persistedId ?? localNoteId

      setCurrentDraftId({
        id: currentDraftId,
        persistedId,
        isUnsaved: isUnsavedNoteId(currentDraftId) || !persistedId,
        source: override?.source ?? (persistedId ? 'server' : 'local-draft'),
        ownerTabId: tabId,
      })
      setDraftPatch(
        {
          title: draft.title,
          problem: draft.problem,
          content: draft.content,
          tags: extractTagsFromMarkdown(draft.content),
          wordCount: calculateWordCount(draft.content),
          isPinned: override?.isPinned ?? note?.is_pinned,
        },
        tabId
      )
    },
    [
      calculateWordCount,
      isActiveTab,
      isUnsavedNote,
      localNoteId,
      note?.id,
      note?.is_pinned,
      noteId,
      setCurrentDraftId,
      setDraftPatch,
      tabId,
    ]
  )

  // Clear stale persisted state before an unsaved note renders in the inspector.
  useLayoutEffect(() => {
    if (!isActiveTab || !isUnsavedNote) return

    syncActiveDraftToStore({
      id: localNoteId,
      persistedId: null,
      source: 'local-draft',
      isPinned: undefined,
    })
  }, [isActiveTab, isUnsavedNote, localNoteId, syncActiveDraftToStore])

  // Beforeunload handler for safety
  useBeforeunloadSave()

  // Recover the active temp draft for /notes/new within the current browser session.
  useEffect(() => {
    if (!isNewNote) return

    let isCancelled = false

    async function resolveNewNoteDraft() {
      try {
        const localNote = sessionTempDraftId
          ? await getNoteLocally(sessionTempDraftId)
          : undefined

        if (isCancelled) return

        if (isRecoverableLocalDraft(localNote)) {
          setResolvedTempNoteId(localNote.id)
          setCurrentSessionTempDraftId(localNote.id)
          await recoverLocalDraft(localNote)
        } else {
          const freshTempNoteId = generatedTempNoteId
          if (sessionTempDraftId) {
            clearCurrentSessionTempDraftId()
          }

          setResolvedTempNoteId(freshTempNoteId)
          setCurrentSessionTempDraftId(freshTempNoteId)
          hasRecoveredLocalDraftRef.current = false
          setTitle('')
          setProblem('')
          setContent('')
        }
      } catch {
        if (isCancelled) return

        setResolvedTempNoteId(generatedTempNoteId)
        setCurrentSessionTempDraftId(generatedTempNoteId)
        hasRecoveredLocalDraftRef.current = false
        setTitle('')
        setProblem('')
        setContent('')
      } finally {
        if (!isCancelled) {
          setIsRecovering(false)
        }
      }
    }

    setIsRecovering(true)
    void resolveNewNoteDraft()

    return () => {
      isCancelled = true
    }
  }, [generatedTempNoteId, isNewNote, recoverLocalDraft, sessionTempDraftId])

  // Recover local drafts for persisted notes and temp note tabs.
  useEffect(() => {
    if (isNewNote) return

    let isCancelled = false

    async function checkLocalChanges() {
      try {
        const localNote = await getNoteLocally(localNoteId)
        if (isCancelled) return

        if (isRecoverableLocalDraft(localNote)) {
          await recoverLocalDraft(localNote)
        } else {
          hasRecoveredLocalDraftRef.current = false
        }
      } catch {
        if (!isCancelled) {
          hasRecoveredLocalDraftRef.current = false
        }
      } finally {
        if (!isCancelled) {
          setIsRecovering(false)
        }
      }
    }

    setIsRecovering(true)
    void checkLocalChanges()

    return () => {
      isCancelled = true
    }
  }, [isNewNote, localNoteId, recoverLocalDraft])

  // Initialize form from the server when no fresher local draft exists
  useEffect(() => {
    let isCancelled = false

    if (note && !isUnsavedNote && !isRecovering) {
      void getNoteLocally(noteId).then((localNote) => {
        if (isCancelled) return

        const hasRecoverableLocalDraft = isRecoverableLocalDraft(localNote)
        hasRecoveredLocalDraftRef.current = hasRecoverableLocalDraft

        if (!hasRecoverableLocalDraft) {
          setTitle(note.title ?? '')
          setProblem(note.problem ?? '')
          setContent(note.content ?? '')

          if (isActiveTab) {
            hydrateFromServer(note, tabId)
          }
        }
      })

      if (tabId) {
        updateTabTitle(tabId, note.title || 'Untitled')
      }
    }

    return () => {
      isCancelled = true
    }
  }, [note, isUnsavedNote, isRecovering, noteId, isActiveTab, hydrateFromServer, tabId, updateTabTitle])

  // Keep the store aligned with whichever editor tab is currently active
  useEffect(() => {
    if (isRecovering || !isActiveTab) return

    if (isUnsavedNote) {
      syncActiveDraftToStore({
        id: localNoteId,
        persistedId: null,
        source: 'local-draft',
        isPinned: undefined,
      })
      return
    }

    syncActiveDraftToStore({
      id: note?.id ?? noteId,
      persistedId: note?.id ?? noteId,
      source: hasRecoveredLocalDraftRef.current ? 'local-draft' : 'server',
      isPinned: note?.is_pinned,
    })
  }, [
    isActiveTab,
    isUnsavedNote,
    isRecovering,
    localNoteId,
    note?.id,
    note?.is_pinned,
    noteId,
    syncActiveDraftToStore,
  ])

  // Watch for server ID mapping and update URL/store without triggering a refetch
  useEffect(() => {
    if (localNoteId.startsWith('temp_') && !hasUpdatedUrl.current) {
      const syncServerId = () => {
        const serverId = getServerId(localNoteId)
        if (serverId && !hasUpdatedUrl.current) {
          hasUpdatedUrl.current = true
          clearCurrentSessionTempDraftId()

          if (isActiveTab) {
            setCurrentDraftId({
              id: serverId,
              persistedId: serverId,
              isUnsaved: false,
              source: 'server',
              ownerTabId: tabId,
            })

            window.history.replaceState(null, '', `/notes/${serverId}`)
          }

          if (tabId) {
            updateTabNoteId(tabId, serverId)
          }
        }
      }

      syncServerId()
      const checkServerId = setInterval(syncServerId, 500)

      return () => clearInterval(checkServerId)
    }
  }, [isActiveTab, localNoteId, getServerId, setCurrentDraftId, tabId, updateTabNoteId])

  // Cleanup store on unmount - only the owning editor tab may clear it
  useEffect(() => {
    return () => {
      reset(tabId)
    }
  }, [reset, tabId])

  // Handle title change - instant save
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)
    save({ title: newTitle })

    if (isActiveTab) {
      setDraftPatch({ title: newTitle }, tabId)
    }

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

      if (isActiveTab) {
        setDraftPatch({ problem: currentSuggestion }, tabId)
      }

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

    if (isActiveTab) {
      setDraftPatch({ problem: newProblem }, tabId)
    }

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
      const tags = extractTagsFromMarkdown(cleaned.content)
      const wordCount = calculateWordCount(cleaned.content)

      setTitle(cleaned.title)
      setProblem(cleaned.problem)
      setContent(cleaned.content)
      save({
        title: cleaned.title,
        problem: cleaned.problem || null,
        content: cleaned.content,
        wordCount,
        tags,
      })

      if (isActiveTab) {
        setDraftPatch(
          {
            title: cleaned.title,
            problem: cleaned.problem,
            content: cleaned.content,
            tags,
            wordCount,
          },
          tabId
        )
      }

      if (tabId) {
        updateTabTitle(tabId, cleaned.title || 'Untitled')
      }
    }
  }

  // Handle content save from editor - instant save
  const handleContentSave = useCallback(
    (markdown: string) => {
      const tags = extractTagsFromMarkdown(markdown)
      const wordCount = calculateWordCount(markdown)

      setContent(markdown)
      save({
        content: markdown,
        wordCount,
        tags,
      })

      if (isActiveTab) {
        setDraftPatch(
          {
            content: markdown,
            tags,
            wordCount,
          },
          tabId
        )
      }
    },
    [calculateWordCount, isActiveTab, save, setDraftPatch, tabId]
  )

  // Handle content change (for local state only)
  const handleContentChange = (markdown: string) => {
    setContent(markdown)
  }

  // Loading state
  if (isRecovering || (!isUnsavedNote && isLoading)) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Error state
  if (!isUnsavedNote && (error || (!isLoading && !note))) {
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
          {!isUnsavedNote && note && (
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
              wikiLinkConfig={wikiLinkConfig}
              hashTagConfig={hashTagConfig}
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
