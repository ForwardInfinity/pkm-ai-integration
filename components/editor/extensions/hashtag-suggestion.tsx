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
import { isValidTagName } from '@/lib/tags'
import { Tag, Plus } from 'lucide-react'
import type { TagCount } from '@/features/notes/types'

export interface HashTagSuggestionItem {
  tag: string
  count: number
}

interface HashTagSuggestionListProps {
  items: HashTagSuggestionItem[]
  command: (item: HashTagSuggestionItem | { tag: string; count: 0; isNew: true }) => void
  query: string
}

interface HashTagSuggestionListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean
}

const HashTagSuggestionList = forwardRef<
  HashTagSuggestionListRef,
  HashTagSuggestionListProps
>(({ items, command, query }, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0)

  // Include "Create new tag" option if query doesn't match any existing tag exactly
  const normalizedQuery = query.toLowerCase().trim()
  const hasExactMatch = items.some(
    (item) => item.tag.toLowerCase() === normalizedQuery
  )
  // Only show create option if query is valid (starts with letter, alphanumeric/hyphen/underscore)
  const isValidTag = isValidTagName(normalizedQuery)
  const showCreateOption = normalizedQuery.length > 0 && !hasExactMatch && isValidTag
  const totalItems = items.length + (showCreateOption ? 1 : 0)

  const selectItem = useCallback(
    (index: number) => {
      if (showCreateOption && index === items.length) {
        command({ tag: normalizedQuery, count: 0, isNew: true })
      } else if (items[index]) {
        command(items[index])
      }
    },
    [items, command, normalizedQuery, showCreateOption]
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
      <div className="hashtag-suggestion-list bg-popover border border-border rounded-md shadow-md p-2 min-w-[200px]">
        <p className="text-sm text-muted-foreground px-2 py-1">
          No tags found
        </p>
      </div>
    )
  }

  return (
    <div className="hashtag-suggestion-list bg-popover border border-border rounded-md shadow-md py-1 min-w-[200px] max-h-[300px] overflow-y-auto">
      {items.map((item, index) => (
        <button
          key={item.tag}
          type="button"
          className={cn(
            'w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-muted/50 transition-colors',
            index === selectedIndex && 'bg-muted'
          )}
          onClick={() => selectItem(index)}
        >
          <div className="flex items-center gap-2">
            <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <span className="text-sm font-medium">#{item.tag}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {item.count} {item.count === 1 ? 'note' : 'notes'}
          </span>
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
          <Plus className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-sm">
            Create <span className="font-medium">#{normalizedQuery}</span>
          </span>
        </button>
      )}
    </div>
  )
})

HashTagSuggestionList.displayName = 'HashTagSuggestionList'

export interface HashTagSuggestionConfig {
  getTags: () => TagCount[]
}

const HashTagSuggestionPluginKey = new PluginKey('hashtag-suggestion')

export function createHashTagSuggestion(
  config: HashTagSuggestionConfig
): Omit<SuggestionOptions<HashTagSuggestionItem>, 'editor'> {
  return {
    pluginKey: HashTagSuggestionPluginKey,
    char: '#',
    allowSpaces: false,
    startOfLine: false,
    allowedPrefixes: null, // Allow at start of content or after any character

    items: ({ query }) => {
      const tags = config.getTags()
      if (!query) return tags.slice(0, 10)

      const lowerQuery = query.toLowerCase()
      return tags
        .filter((tag) => tag.tag.toLowerCase().includes(lowerQuery))
        .slice(0, 10)
    },

    render: () => {
      let component: ReactRenderer<HashTagSuggestionListRef> | null = null
      let popup: TippyInstance[] | null = null

      return {
        onStart: (props: SuggestionProps<HashTagSuggestionItem>) => {
          component = new ReactRenderer(HashTagSuggestionList, {
            props: {
              ...props,
              command: (item: HashTagSuggestionItem | { tag: string; count: 0; isNew: true }) => {
                props.command(item)
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

        onUpdate(props: SuggestionProps<HashTagSuggestionItem>) {
          component?.updateProps({
            ...props,
            command: (item: HashTagSuggestionItem | { tag: string; count: 0; isNew: true }) => {
              props.command(item)
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
      // Delete the # trigger and query text
      editor
        .chain()
        .focus()
        .deleteRange(range)
        .insertContent({
          type: 'hashtag',
          attrs: {
            tag: props.tag.toLowerCase(),
          },
        })
        .run()
    },
  }
}
