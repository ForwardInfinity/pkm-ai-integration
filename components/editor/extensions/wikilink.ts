import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>
  onWikiLinkClick?: (noteTitle: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikilink: {
      insertWikiLink: (title: string, displayText?: string) => ReturnType
    }
  }
}

// Markdown-it inline rule for parsing [[wikilinks]]
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wikilinkRule(state: any, silent: boolean): boolean {
  const max = state.posMax
  const start = state.pos

  // Quick check: must start with [[
  if (state.src.charCodeAt(start) !== 0x5B /* [ */ ||
      state.src.charCodeAt(start + 1) !== 0x5B /* [ */) {
    return false
  }

  // Find the closing ]]
  let pos = start + 2
  let title = ''
  let displayText = ''
  let foundPipe = false

  while (pos < max) {
    const ch = state.src.charCodeAt(pos)
    
    // Found closing ]]
    if (ch === 0x5D /* ] */ && state.src.charCodeAt(pos + 1) === 0x5D /* ] */) {
      if (!silent) {
        const token = state.push('wikilink', 'span', 0)
        token.attrs = [
          ['data-type', 'wikilink'],
          ['data-title', title.trim()],
          ['class', 'wikilink'],
        ]
        if (displayText) {
          token.attrs.push(['data-display-text', displayText.trim()])
        }
        token.content = displayText.trim() || title.trim()
      }
      state.pos = pos + 2
      return true
    }

    // Found pipe separator
    if (ch === 0x7C /* | */ && !foundPipe) {
      foundPipe = true
      pos++
      continue
    }

    // Don't allow nested brackets
    if (ch === 0x5B /* [ */ || ch === 0x5D /* ] */) {
      return false
    }

    if (foundPipe) {
      displayText += state.src.charAt(pos)
    } else {
      title += state.src.charAt(pos)
    }
    pos++
  }

  return false
}

// Markdown-it renderer for wikilink tokens
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderWikilink(tokens: any[], idx: number): string {
  const token = tokens[idx]
  const title = token.attrGet('data-title') || ''
  const displayText = token.attrGet('data-display-text') || token.content || title
  return `<span data-type="wikilink" data-title="${title}" class="wikilink">${displayText}</span>`
}

export const WikiLink = Node.create<WikiLinkOptions>({
  name: 'wikilink',
  
  group: 'inline',
  
  inline: true,
  
  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'wikilink',
      },
      onWikiLinkClick: undefined,
    }
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => ({
          'data-title': attributes.title,
        }),
      },
      displayText: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-display-text'),
        renderHTML: (attributes) => ({
          'data-display-text': attributes.displayText,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wikilink"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const displayText = node.attrs.displayText || node.attrs.title
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'wikilink' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      displayText,
    ]
  },

  addCommands() {
    return {
      insertWikiLink:
        (title: string, displayText?: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { title, displayText: displayText || null },
          })
        },
    }
  },

  // tiptap-markdown storage for serialization and parsing
  addStorage() {
    return {
      markdown: {
        serialize(
          state: { write: (text: string) => void },
          node: { attrs: { title: string; displayText: string | null } }
        ) {
          const { title, displayText } = node.attrs
          if (displayText && displayText !== title) {
            state.write(`[[${title}|${displayText}]]`)
          } else {
            state.write(`[[${title}]]`)
          }
        },
        parse: {
          // Setup markdown-it to parse [[wikilinks]]
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.inline.ruler.before('link', 'wikilink', wikilinkRule)
            markdownit.renderer.rules.wikilink = renderWikilink
          },
        },
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        return false
      },
    }
  },

  addProseMirrorPlugins() {
    const { onWikiLinkClick } = this.options

    return [
      new Plugin({
        key: new PluginKey('wikilink-click-handler'),
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement
            if (target.classList.contains('wikilink') && target.dataset.title) {
              event.preventDefault()
              onWikiLinkClick?.(target.dataset.title)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

// Helper to extract wikilinks from markdown text
export function extractWikiLinksFromMarkdown(markdown: string): Array<{ title: string; displayText: string | null }> {
  const regex = /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g
  const links: Array<{ title: string; displayText: string | null }> = []
  let match

  while ((match = regex.exec(markdown)) !== null) {
    links.push({
      title: match[1].trim(),
      displayText: match[2]?.trim() || null,
    })
  }

  return links
}
