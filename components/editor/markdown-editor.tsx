'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'
import TaskList from '@tiptap/extension-task-list'
import Suggestion from '@tiptap/suggestion'
import { UnderlineMarkdown, HighlightMarkdown, WikiLink, createWikiLinkSuggestion, HashTag, createHashTagSuggestion } from './extensions'
import TaskItem from '@tiptap/extension-task-item'
import Typography from '@tiptap/extension-typography'
import { useEffect, useRef, useMemo } from 'react'
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
  wikiLinkConfig,
  hashTagConfig,
}: MarkdownEditorProps) {
  const initialContentRef = useRef(content)
  const hasInitializedRef = useRef(false)

  // Memoize extensions to prevent recreating on every render
  const extensions = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const baseExtensions: any[] = [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: {
            class: 'not-prose',
          },
        },
      }),
      Markdown.configure({
        html: true,
        tightLists: true,
        bulletListMarker: '-',
        transformPastedText: true,
        transformCopiedText: true,
      }),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'is-editor-empty',
      }),
      Link.configure({
        openOnClick: false,
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
    ]

    // Add WikiLink extension if configured
    if (wikiLinkConfig) {
      baseExtensions.push(
        WikiLink.configure({
          onWikiLinkClick: wikiLinkConfig.onWikiLinkClick,
        }).extend({
          addProseMirrorPlugins() {
            const originalPlugins = this.parent?.() ?? []
            return [
              ...originalPlugins,
              Suggestion({
                editor: this.editor,
                ...createWikiLinkSuggestion({
                  getNotes: wikiLinkConfig.getNotes,
                  onCreateNote: wikiLinkConfig.onCreateNote,
                }),
              }),
            ]
          },
        })
      )
    } else {
      // Add basic WikiLink without suggestion
      baseExtensions.push(WikiLink)
    }

    // Add HashTag extension if configured
    if (hashTagConfig) {
      baseExtensions.push(
        HashTag.configure({
          onHashTagClick: hashTagConfig.onHashTagClick,
        }).extend({
          addProseMirrorPlugins() {
            const originalPlugins = this.parent?.() ?? []
            return [
              ...originalPlugins,
              Suggestion({
                editor: this.editor,
                ...createHashTagSuggestion({
                  getTags: hashTagConfig.getTags,
                }),
              }),
            ]
          },
        })
      )
    } else {
      // Add basic HashTag without suggestion (still parses #tags from markdown)
      baseExtensions.push(HashTag)
    }

    return baseExtensions
  }, [placeholder, wikiLinkConfig, hashTagConfig])

  const editor = useEditor({
    editorProps: {
      attributes: {
        spellcheck: 'false',
      },
    },
    extensions,
    content: '',
    editable,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const markdownStorage = (editor.storage as any).markdown
      const markdown = markdownStorage?.getMarkdown?.() ?? ''
      onChange?.(markdown)
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
