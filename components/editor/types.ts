/**
 * Props for the MarkdownEditor component
 */
export interface MarkdownEditorProps {
  /** Initial markdown content */
  content?: string

  /** Placeholder text when editor is empty */
  placeholder?: string

  /** Called on every content change with the markdown string */
  onChange?: (markdown: string) => void

  /** Called after debounced auto-save delay with the markdown string */
  onSave?: (markdown: string) => void

  /** Auto-save debounce delay in milliseconds (default: 2000) */
  autoSaveDelay?: number

  /** Additional CSS classes for the editor container */
  className?: string

  /** Whether the editor is editable (default: true) */
  editable?: boolean
}

/**
 * Save status for tracking auto-save state
 */
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface SaveState {
  status: SaveStatus
  lastSavedAt?: Date
}
