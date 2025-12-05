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
      {/* Header with save status */}
      <div className="flex items-center justify-end px-8 py-2 border-b">
        <SaveStatusIndicator status={saveStatus} />
      </div>

      {/* Editor content */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto px-8 py-8">
          {/* Title input */}
          <input
            type="text"
            value={title}
            onChange={handleTitleChange}
            placeholder="Untitled"
            className="w-full mb-4 text-4xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 focus:ring-0"
          />

          {/* Problem field - visually prominent */}
          <div className="relative mb-8 rounded-lg border border-primary/20 bg-primary/5 p-4">
            <textarea
              value={problem}
              onChange={handleProblemChange}
              placeholder="What problem does this solve?"
              rows={2}
              className={cn(
                "w-full resize-none bg-transparent text-base text-foreground/80",
                "border-none outline-none placeholder:text-muted-foreground/50",
                "focus:ring-0 pr-32"
              )}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReconstructProblem}
              className="absolute right-2 bottom-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Sparkles className="h-3.5 w-3.5 mr-1.5" />
              Reconstruct Problem
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
