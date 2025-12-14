export type InngestEvents = {
  'note/embedding.requested': {
    data: {
      noteId: string
      expectedHash: string
    }
  }
}
