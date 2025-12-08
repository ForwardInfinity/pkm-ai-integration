export type InngestEvents = {
  'note/embedding.requested': {
    data: {
      noteId: string
      title: string
      problem: string | null
      content: string
    }
  }
}
