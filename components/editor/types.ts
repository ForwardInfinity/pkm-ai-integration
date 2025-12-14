import type { WikiLinkSuggestionItem, HashTagSuggestionItem } from './extensions'

/**
 * WikiLink configuration for enabling note linking
 */
export interface WikiLinkConfig {
  /** Function to get available notes for autocomplete */
  getNotes: () => WikiLinkSuggestionItem[]
  /** Callback when a wikilink is clicked */
  onWikiLinkClick?: (noteTitle: string) => void
  /** Callback to create a new note from autocomplete */
  onCreateNote?: (title: string) => Promise<string | null>
}

/**
 * HashTag configuration for inline tag support
 */
export interface HashTagConfig {
  /** Function to get available tags for autocomplete */
  getTags: () => HashTagSuggestionItem[]
  /** Callback when a hashtag is clicked (e.g., to filter notes) */
  onHashTagClick?: (tag: string) => void
}

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

  /** WikiLink configuration for note linking (optional) */
  wikiLinkConfig?: WikiLinkConfig

  /** HashTag configuration for inline tags (optional) */
  hashTagConfig?: HashTagConfig
}
