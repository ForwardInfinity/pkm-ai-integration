'use client'

import { ReactRenderer } from '@tiptap/react'
import { SuggestionOptions, SuggestionProps } from '@tiptap/suggestion'
import { PluginKey } from '@tiptap/pm/state'
import tippy, { Instance as TippyInstance } from 'tippy.js'
import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  useCallback,
} from 'react'
import { cn } from '@/lib/utils'
import { FileText, Plus } from 'lucide-react'

export interface WikiLinkSuggestionItem {
  id: string
  title: string
  problem: string | null
}

interface WikiLinkSuggestionListProps {
  items: WikiLinkSuggestionItem[]
  command: (item: WikiLinkSuggestionItem | { id: 'create'; title: string }) => void
  query: string
}

interface WikiLinkSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const WikiLinkSuggestionList = forwardRef<
  WikiLinkSuggestionListRef,
  WikiLinkSuggestionListProps
>(({ items, command, query }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Include "Create new note" option if query doesn't match any existing note exactly
  const hasExactMatch = items.some(
    (item) => item.title.toLowerCase() === query.toLowerCase()
  )
  const showCreateOption = query.trim().length > 0 && !hasExactMatch
  const totalItems = items.length + (showCreateOption ? 1 : 0)

  const selectItem = useCallback(
    (index: number) => {
      if (showCreateOption && index === items.length) {
        command({ id: 'create', title: query.trim() })
      } else if (items[index]) {
        command(items[index])
      }
    },
    [items, command, query, showCreateOption]
  )

  useEffect(() => {
    setSelectedIndex(0)
  }, [items])

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (totalItems === 0) return false

      if (event.key === 'ArrowUp') {
        setSelectedIndex((prev) => (prev + totalItems - 1) % totalItems)
        return true
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((prev) => (prev + 1) % totalItems)
        return true
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex)
        return true
      }

      return false
    },
  }))

  if (totalItems === 0) {
    return (
      <div className="wikilink-suggestion-list bg-popover border border-border rounded-md shadow-md p-2 min-w-[200px]">
        <p className="text-sm text-muted-foreground px-2 py-1">
          No notes found
        </p>
      </div>
    )
  }

  return (
    <div className="wikilink-suggestion-list bg-popover border border-border rounded-md shadow-md py-1 min-w-[250px] max-h-[300px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.id}
          type="button"
          className={cn(
            'w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
            index === selectedIndex && 'bg-muted'
          )}
          onClick={() => selectItem(index)}
        >
          <FileText className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{item.title}</p>
            {item.problem && (
              <p className="text-xs text-muted-foreground truncate">
                {item.problem}
              </p>
            )}
          </div>
        </button>
      ))}
      {showCreateOption && (
        <button
          type="button"
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors border-t border-border',
            selectedIndex === items.length && 'bg-muted'
          )}
          onClick={() => selectItem(items.length)}
        >
          <Plus className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm">
            Create &quot;<span className="font-medium">{query}</span>&quot;
          </span>
        </button>
      )}
    </div>
  )
})

WikiLinkSuggestionList.displayName = 'WikiLinkSuggestionList'

export interface WikiLinkSuggestionConfig {
  getNotes: () => WikiLinkSuggestionItem[]
  onCreateNote?: (title: string) => Promise<string | null>
}

const WikiLinkSuggestionPluginKey = new PluginKey('wikilink-suggestion')

export function createWikiLinkSuggestion(
  config: WikiLinkSuggestionConfig
): Omit<SuggestionOptions<WikiLinkSuggestionItem>, 'editor'> {
  return {
    pluginKey: WikiLinkSuggestionPluginKey,
    char: '[[',
    allowSpaces: true,
    startOfLine: false,

    items: ({ query }) => {
      const notes = config.getNotes()
      if (!query) return notes.slice(0, 10)

      const lowerQuery = query.toLowerCase()
      return notes
        .filter((note) => note.title.toLowerCase().includes(lowerQuery))
        .slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<WikiLinkSuggestionListRef> | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: SuggestionProps<WikiLinkSuggestionItem>) => {
          component = new ReactRenderer(WikiLinkSuggestionList, {
            props: {
              ...props,
              command: async (item: WikiLinkSuggestionItem | { id: 'create'; title: string }) => {
                if (item.id === 'create' && 'title' in item && config.onCreateNote) {
                  const noteId = await config.onCreateNote(item.title)
                  if (noteId) {
                    props.command({ id: noteId, title: item.title, problem: null })
                  }
                } else if ('title' in item && item.id !== 'create') {
                  props.command(item as WikiLinkSuggestionItem)
                }
              },
            },
            editor: props.editor,
          })

          if (!props.clientRect) return

          popup = tippy('body', {
            getReferenceClientRect: props.clientRect as () => DOMRect,
            appendTo: () => document.body,
            content: component.element,
            showOnCreate: true,
            interactive: true,
            trigger: 'manual',
            placement: 'bottom-start',
          })
        },

        onUpdate(props: SuggestionProps<WikiLinkSuggestionItem>) {
          component?.updateProps({
            ...props,
            command: async (item: WikiLinkSuggestionItem | { id: 'create'; title: string }) => {
              if (item.id === 'create' && 'title' in item && config.onCreateNote) {
                const noteId = await config.onCreateNote(item.title)
                if (noteId) {
                  props.command({ id: noteId, title: item.title, problem: null })
                }
              } else if ('title' in item && item.id !== 'create') {
                props.command(item as WikiLinkSuggestionItem)
              }
            },
          })

          if (!props.clientRect) return

          popup?.[0]?.setProps({
            getReferenceClientRect: props.clientRect as () => DOMRect,
          })
        },

        onKeyDown(props: { event: KeyboardEvent }) {
          if (props.event.key === 'Escape') {
            popup?.[0]?.hide()
            return true
          }

          return component?.ref?.onKeyDown(props) ?? false
        },

        onExit() {
          popup?.[0]?.destroy()
          component?.destroy()
        },
      }
    },

    command: ({ editor, range, props }) => {
      // Delete the [[ trigger and query text
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'wikilink',
          attrs: {
            title: props.title,
            displayText: null,
          },
        })
        .run()
    },
  }
}
