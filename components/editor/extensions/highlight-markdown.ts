import Highlight from '@tiptap/extension-highlight'
import markdownitMark from 'markdown-it-mark'

export const HighlightMarkdown = Highlight.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '==', close: '==' },
        parse: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setup(markdownit: any) {
            markdownit.use(markdownitMark)
          },
        },
      },
    }
  },
})
