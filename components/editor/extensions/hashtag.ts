import { Node, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'

export interface HashTagOptions {
  HTMLAttributes: Record<string, unknown>
  onHashTagClick?: (tag: string) => void
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    hashtag: {
      insertHashTag: (tag: string) => ReturnType
    }
  }
}

// Markdown-it inline rule for parsing #hashtags
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function hashtagRule(state: any, silent: boolean): boolean {
  const start = state.pos
  const max = state.posMax

  // Must start with #
  if (state.src.charCodeAt(start) !== 0x23 /* # */) {
    return false
  }

  // Check that # is at start of line or preceded by whitespace
  if (start > 0) {
    const prevChar = state.src.charCodeAt(start - 1)
    // Must be preceded by whitespace or start of string
    if (prevChar !== 0x20 /* space */ &&
        prevChar !== 0x09 /* tab */ &&
        prevChar !== 0x0A /* newline */ &&
        prevChar !== 0x0D /* carriage return */) {
      return false
    }
  }

  // Next character must be a letter (tags can't start with numbers)
  const nextChar = state.src.charCodeAt(start + 1)
  if (!((nextChar >= 0x41 && nextChar <= 0x5A) || // A-Z
        (nextChar >= 0x61 && nextChar <= 0x7A))) { // a-z
    return false
  }

  // Find the end of the tag (alphanumeric, underscore, hyphen)
  let pos = start + 2
  while (pos < max) {
    const ch = state.src.charCodeAt(pos)
    if ((ch >= 0x41 && ch <= 0x5A) || // A-Z
        (ch >= 0x61 && ch <= 0x7A) || // a-z
        (ch >= 0x30 && ch <= 0x39) || // 0-9
        ch === 0x5F || // underscore
        ch === 0x2D) { // hyphen
      pos++
    } else {
      break
    }
  }

  // Must have at least one character after #
  if (pos === start + 1) {
    return false
  }

  const tag = state.src.slice(start + 1, pos)

  if (!silent) {
    const token = state.push('hashtag', 'span', 0)
    token.attrs = [
      ['data-type', 'hashtag'],
      ['data-tag', tag.toLowerCase()],
      ['class', 'hashtag'],
    ]
    token.content = `#${tag}`
  }

  state.pos = pos
  return true
}

// Markdown-it renderer for hashtag tokens
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderHashtag(tokens: any[], idx: number): string {
  const token = tokens[idx]
  const tag = token.attrGet('data-tag') || ''
  return `<span data-type="hashtag" data-tag="${tag}" class="hashtag">#${tag}</span>`
}

export const HashTag = Node.create<HashTagOptions>({
  name: 'hashtag',

  group: 'inline',

  inline: true,

  atom: true,

  addOptions() {
    return {
      HTMLAttributes: {
        class: 'hashtag',
      },
      onHashTagClick: undefined,
    }
  },

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag'),
        renderHTML: (attributes) => ({
          'data-tag': attributes.tag,
        }),
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="hashtag"]',
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(
        { 'data-type': 'hashtag' },
        this.options.HTMLAttributes,
        HTMLAttributes
      ),
      `#${node.attrs.tag}`,
    ]
  },

  addCommands() {
    return {
      insertHashTag:
        (tag: string) =>
        ({ commands }) => {
          return commands.insertContent({
            type: this.name,
            attrs: { tag: tag.toLowerCase() },
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
          node: { attrs: { tag: string } }
        ) {
          state.write(`#${node.attrs.tag}`)
        },
        parse: {
          // Setup markdown-it to parse #hashtags
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.inline.ruler.before('link', 'hashtag', hashtagRule)
            markdownit.renderer.rules.hashtag = renderHashtag
          },
        },
      },
    }
  },

  addProseMirrorPlugins() {
    const { onHashTagClick } = this.options

    return [
      new Plugin({
        key: new PluginKey('hashtag-click-handler'),
        props: {
          handleClick(view, pos, event) {
            const target = event.target as HTMLElement
            if (target.classList.contains('hashtag') && target.dataset.tag) {
              event.preventDefault()
              onHashTagClick?.(target.dataset.tag)
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})
