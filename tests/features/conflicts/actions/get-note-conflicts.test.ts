import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getNoteConflicts } from '@/features/conflicts/actions/get-note-conflicts';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOr = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => {
      mockFrom(table);
      return {
        select: (query: string) => {
          mockSelect(query);
          return {
            eq: (column: string, value: string) => {
              mockEq(column, value);
              return {
                or: (filter: string) => {
                  mockOr(filter);
                  return mockOr.mock.results[mockOr.mock.calls.length - 1]
                    ?.value ?? { data: null, error: null };
                },
              };
            },
          };
        },
      };
    },
  }),
}));

describe('getNoteConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch conflicts for a specific note', async () => {
    const noteId = 'note-1';
    const mockConflicts = [
      {
        id: 'conflict-1',
        explanation: 'Contradiction',
        conflict_type: 'contradiction',
        note_a_id: noteId,
        note_b_id: 'note-2',
        note_a: { id: noteId, title: 'My Note' },
        note_b: { id: 'note-2', title: 'Other Note' },
      },
    ];

    mockOr.mockReturnValue({ data: mockConflicts, error: null });

    const result = await getNoteConflicts(noteId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0]).toEqual({
      id: 'conflict-1',
      explanation: 'Contradiction',
      conflict_type: 'contradiction',
      otherNoteId: 'note-2',
      otherNoteTitle: 'Other Note',
    });
    expect(mockFrom).toHaveBeenCalledWith('conflicts');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockOr).toHaveBeenCalledWith(`note_a_id.eq.${noteId},note_b_id.eq.${noteId}`);
  });

  it('should identify other note when target is note_b', async () => {
    const noteId = 'note-2';
    const mockConflicts = [
      {
        id: 'conflict-1',
        explanation: 'Tension',
        conflict_type: 'tension',
        note_a_id: 'note-1',
        note_b_id: noteId,
        note_a: { id: 'note-1', title: 'Other Note' },
        note_b: { id: noteId, title: 'My Note' },
      },
    ];

    mockOr.mockReturnValue({ data: mockConflicts, error: null });

    const result = await getNoteConflicts(noteId);

    expect(result.success).toBe(true);
    expect(result.data![0].otherNoteId).toBe('note-1');
    expect(result.data![0].otherNoteTitle).toBe('Other Note');
  });

  it('should filter out conflicts with null notes', async () => {
    const noteId = 'note-1';
    const mockConflicts = [
      {
        id: 'conflict-1',
        explanation: 'Valid',
        conflict_type: 'contradiction',
        note_a_id: noteId,
        note_b_id: 'note-2',
        note_a: { id: noteId, title: 'My Note' },
        note_b: { id: 'note-2', title: 'Other Note' },
      },
      {
        id: 'conflict-2',
        explanation: 'Invalid',
        conflict_type: 'tension',
        note_a_id: noteId,
        note_b_id: 'note-3',
        note_a: { id: noteId, title: 'My Note' },
        note_b: null,
      },
    ];

    mockOr.mockReturnValue({ data: mockConflicts, error: null });

    const result = await getNoteConflicts(noteId);

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].id).toBe('conflict-1');
  });

  it('should return error when query fails', async () => {
    mockOr.mockReturnValue({ data: null, error: { message: 'Database error' } });

    const result = await getNoteConflicts('note-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });

  it('should return empty array when no conflicts exist', async () => {
    mockOr.mockReturnValue({ data: [], error: null });

    const result = await getNoteConflicts('note-1');

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle unexpected errors', async () => {
    mockOr.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await getNoteConflicts('note-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });
});
