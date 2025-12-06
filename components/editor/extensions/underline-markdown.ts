import Underline from '@tiptap/extension-underline'

export const UnderlineMarkdown = Underline.extend({
  addStorage() {
    return {
      markdown: {
        serialize: { open: '<u>', close: '</u>' },
        parse: {},
      },
    }
  },
})
