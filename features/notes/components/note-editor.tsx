'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MarkdownEditor } from '@/components/editor'
import { useNote, useUpdateNote, useCreateNote } from '../hooks'
import { useDebouncedCallback } from '@/hooks/use-debounce'
import { useNoteEditorStore } from '@/stores'
import { Button } from '@/components/ui/button'
import { Loader2, Check, AlertCircle, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'

interface NoteEditorProps {
  noteId: string
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export function NoteEditor({ noteId }: NoteEditorProps) {
  const router = useRouter()
  const isNewNote = noteId === 'new'

  // Data fetching
  const { data: note, isLoading, error } = useNote(noteId)
  const updateNote = useUpdateNote()
  const createNote = useCreateNote()

  // Store for sharing note context with inspector
  const { setCurrentNote, setCurrentNoteId, reset } = useNoteEditorStore()

  // Local state for form fields
  const [title, setTitle] = useState('')
  const [problem, setProblem] = useState('')
  const [content, setContent] = useState('')
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [hasCreated, setHasCreated] = useState(false)
  const [createdNoteId, setCreatedNoteId] = useState<string | null>(null)

  // Initialize form from loaded note and update store
  useEffect(() => {
    if (note && !isNewNote) {
      setTitle(note.title ?? '')
      setProblem(note.problem ?? '')
      setContent(note.content ?? '')
      setCurrentNote(note)
    } else if (isNewNote) {
      setCurrentNoteId('new')
    }
  }, [note, isNewNote, setCurrentNote, setCurrentNoteId])

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

  // Debounced save for title and problem fields
  const debouncedSaveFields = useDebouncedCallback(
    async (data: { title?: string; problem?: string }) => {
      const targetId = createdNoteId ?? noteId
      if (targetId === 'new') return

      setSaveStatus('saving')
      try {
        await updateNote.mutateAsync({
          id: targetId,
          ...data,
        })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
    },
    2000
  )

  // Handle title change
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTitle = e.target.value
    setTitle(newTitle)

    // For existing notes, save immediately (debounced)
    if (!isNewNote || hasCreated) {
      debouncedSaveFields({ title: newTitle })
    }
  }

  // Handle problem change (now using textarea)
  const handleProblemChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newProblem = e.target.value
    setProblem(newProblem)

    // For existing notes, save immediately (debounced)
    if (!isNewNote || hasCreated) {
      debouncedSaveFields({ problem: newProblem })
    }
  }

  // Handle reconstruct problem button click (placeholder for AI integration)
  const handleReconstructProblem = () => {
    // TODO: Wire up AI to reconstruct problem from content
    console.log('Reconstruct problem clicked - AI integration coming soon')
  }

  // Handle content save from editor
  const handleContentSave = async (markdown: string) => {
    setContent(markdown)

    // Create new note on first save if this is a new note
    if (isNewNote && !hasCreated) {
      if (!title.trim() && !markdown.trim()) return // Don't create empty notes

      setSaveStatus('saving')
      try {
        const newNote = await createNote.mutateAsync({
          title: title.trim() || 'Untitled',
          problem: problem.trim() || null,
          content: markdown,
        })
        setHasCreated(true)
        setCreatedNoteId(newNote.id)
        // Update store with the newly created note
        setCurrentNote(newNote)
        // Update URL without full navigation
        router.replace(`/notes/${newNote.id}`, { scroll: false })
        setSaveStatus('saved')
        setTimeout(() => setSaveStatus('idle'), 2000)
      } catch {
        setSaveStatus('error')
      }
      return
    }

    // Update existing note
    const targetId = createdNoteId ?? noteId
    if (targetId === 'new') return

    setSaveStatus('saving')
    try {
      await updateNote.mutateAsync({
        id: targetId,
        content: markdown,
        word_count: calculateWordCount(markdown),
      })
      setSaveStatus('saved')
      setTimeout(() => setSaveStatus('idle'), 2000)
    } catch {
      setSaveStatus('error')
    }
  }

  // Handle content change (for local state only, save is handled separately)
  const handleContentChange = (markdown: string) => {
    setContent(markdown)
  }

  // Loading state
  if (!isNewNote && isLoading) {
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
    <div className="flex flex-1 flex-col">
      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-12">
          {/* Save status - floating subtle indicator */}
          <div className="flex justify-end mb-4 min-h-[20px]">
            <SaveStatusIndicator status={saveStatus} />
          </div>

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
            autoSaveDelay={2000}
            className="min-h-[400px]"
          />
        </div>
      </div>
    </div>
  )
}

// Save status indicator component
function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  if (status === 'idle') return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs',
        status === 'saving' && 'text-muted-foreground',
        status === 'saved' && 'text-green-600 dark:text-green-500',
        status === 'error' && 'text-destructive'
      )}
    >
      {status === 'saving' && (
        <>
          <Loader2 className="h-3 w-3 animate-spin" />
          <span>Saving...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="h-3 w-3" />
          <span>Saved</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="h-3 w-3" />
          <span>Error saving</span>
        </>
      )}
    </div>
  )
}
