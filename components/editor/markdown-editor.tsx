'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import { UnderlineMarkdown, HighlightMarkdown } from './extensions'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { useEffect, useRef } from 'react'
import { EditorBubbleMenu } from './bubble-menu'
import type { MarkdownEditorProps } from './types'
import { cn } from '@/lib/utils'
import './editor-styles.css'

export function MarkdownEditor({
  content = '',
  placeholder = 'Start writing...',
  onChange,
  onSave,
  className,
  editable = true,
}: MarkdownEditorProps) {
  const initialContentRef = useRef(content)
  const hasInitializedRef = useRef(false)

  const editor = useEditor({
    editorProps: {
      attributes: {
        spellcheck: 'false',
      },
    },
    extensions: [
      StarterKit.configure({
        // Disable default code block (we can add syntax highlighting later)
        codeBlock: {
          HTMLAttributes: {
            class: 'not-prose',
          },
        },
      }),
      Markdown.configure({
        html: true, // Enable HTML for underline <u> tag serialization
        tightLists: true, // Cleaner list output
        bulletListMarker: '-', // Use dashes for bullets
        transformPastedText: true, // Parse pasted markdown
        transformCopiedText: true, // Copy as markdown
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false, // Don't open links while editing
        HTMLAttributes: {
          class: 'text-primary underline underline-offset-2',
        },
      }),
      UnderlineMarkdown,
      HighlightMarkdown.configure({
        multicolor: false,
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Typography,
    ],
    content: '', // Start empty, we'll set content after mount
    editable,
    immediatelyRender: false, // Required for SSR compatibility
    onUpdate: ({ editor }) => {
      // Get markdown from tiptap-markdown extension
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdownStorage = (editor.storage as any).markdown
      const markdown = markdownStorage?.getMarkdown?.() ?? ''
      onChange?.(markdown)
      // Call onSave immediately - debouncing is handled by useAutoSave hook
      onSave?.(markdown)
    },
  })

  // Set initial content after editor is ready
  useEffect(() => {
    if (editor && !hasInitializedRef.current) {
      // Set content if there's initial content to set
      if (initialContentRef.current) {
        editor.commands.setContent(initialContentRef.current)
      }
      // Mark as initialized even for empty content (new notes)
      hasInitializedRef.current = true
    }
  }, [editor])

  // Handle external content changes
  useEffect(() => {
    if (editor && hasInitializedRef.current && content !== initialContentRef.current) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdownStorage = (editor.storage as any).markdown
      const currentMarkdown = markdownStorage?.getMarkdown?.() ?? ''
      // Only update if content has actually changed from external source
      if (content !== currentMarkdown) {
        editor.commands.setContent(content)
        initialContentRef.current = content
      }
    }
  }, [editor, content])

  // Cleanup
  useEffect(() => {
    return () => {
      editor?.destroy()
    }
  }, [editor])

  return (
    <div className={cn('tiptap-editor', className)}>
      <EditorBubbleMenu editor={editor} />
      <EditorContent editor={editor} />
    </div>
  )
}

// Export for external access to editor instance if needed
export type { MarkdownEditorProps }
