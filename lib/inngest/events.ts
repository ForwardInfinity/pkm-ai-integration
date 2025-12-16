export type InngestEvents = {
  'note/embedding.requested': {
    data: {
      noteId: string
      expectedHash: string
    }
  }
  'note/embedding.completed': {
    data: {
      noteId: string
      contentHash: string
    }
  }
  'note/conflicts.detection.requested': {
    data: {
      noteId: string
      contentHash: string
    }
  }
}
