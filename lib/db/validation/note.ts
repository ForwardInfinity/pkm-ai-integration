import { z } from 'zod'

// Schema for creating a new note
export const createNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less'),
  problem: z
    .string()
    .max(1000, 'Problem must be 1000 characters or less')
    .nullable()
    .optional(),
  content: z.string().optional().default(''),
  tags: z.array(z.string().max(50)).optional().default([]),
})

// Schema for updating an existing note
export const updateNoteSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less')
    .optional(),
  problem: z
    .string()
    .max(1000, 'Problem must be 1000 characters or less')
    .nullable()
    .optional(),
  content: z.string().optional(),
  tags: z.array(z.string().max(50)).optional(),
  is_pinned: z.boolean().optional(),
  word_count: z.number().int().min(0).optional(),
})

// Schema for the note form (client-side validation)
export const noteFormSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(255, 'Title must be 255 characters or less'),
  problem: z
    .string()
    .max(1000, 'Problem must be 1000 characters or less')
    .nullable()
    .optional(),
  content: z.string().optional().default(''),
  tags: z.array(z.string().max(50)).optional().default([]),
})

// Inferred types from schemas
export type CreateNoteInput = z.infer<typeof createNoteSchema>
export type UpdateNoteInput = z.infer<typeof updateNoteSchema>
export type NoteFormData = z.infer<typeof noteFormSchema>

// Validation helpers
export function validateCreateNote(data: unknown) {
  return createNoteSchema.safeParse(data)
}

export function validateUpdateNote(data: unknown) {
  return updateNoteSchema.safeParse(data)
}

export function validateNoteForm(data: unknown) {
  return noteFormSchema.safeParse(data)
}
