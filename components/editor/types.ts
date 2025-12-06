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

  /** Called immediately on every content change for instant persistence */
  onSave?: (markdown: string) => void

  /** Additional CSS classes for the editor container */
  className?: string

  /** Whether the editor is editable (default: true) */
  editable?: boolean
}
