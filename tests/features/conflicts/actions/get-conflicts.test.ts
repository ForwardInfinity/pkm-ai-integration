import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getConflicts } from '@/features/conflicts/actions/get-conflicts';

const mockSelect = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();
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
                order: (column: string, options: { ascending: boolean }) => {
                  mockOrder(column, options);
                  return mockOrder.mock.results[mockOrder.mock.calls.length - 1]
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

describe('getConflicts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch active conflicts by default', async () => {
    const mockConflicts = [
      {
        id: 'conflict-1',
        explanation: 'Contradiction between notes',
        conflict_type: 'contradiction',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        note_a: { id: 'note-1', title: 'Note A' },
        note_b: { id: 'note-2', title: 'Note B' },
      },
    ];

    mockOrder.mockReturnValue({ data: mockConflicts, error: null });

    const result = await getConflicts();

    expect(result.success).toBe(true);
    expect(result.data).toEqual(mockConflicts);
    expect(mockFrom).toHaveBeenCalledWith('conflicts');
    expect(mockEq).toHaveBeenCalledWith('status', 'active');
    expect(mockOrder).toHaveBeenCalledWith('created_at', { ascending: false });
  });

  it('should filter by custom status', async () => {
    mockOrder.mockReturnValue({ data: [], error: null });

    await getConflicts('dismissed');

    expect(mockEq).toHaveBeenCalledWith('status', 'dismissed');
  });

  it('should filter out conflicts with null notes', async () => {
    const mockConflicts = [
      {
        id: 'conflict-1',
        explanation: 'Valid conflict',
        conflict_type: 'contradiction',
        status: 'active',
        created_at: '2024-01-01T00:00:00Z',
        note_a: { id: 'note-1', title: 'Note A' },
        note_b: { id: 'note-2', title: 'Note B' },
      },
      {
        id: 'conflict-2',
        explanation: 'Conflict with deleted note',
        conflict_type: 'tension',
        status: 'active',
        created_at: '2024-01-02T00:00:00Z',
        note_a: null,
        note_b: { id: 'note-3', title: 'Note C' },
      },
    ];

    mockOrder.mockReturnValue({ data: mockConflicts, error: null });

    const result = await getConflicts();

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data![0].id).toBe('conflict-1');
  });

  it('should return error when query fails', async () => {
    mockOrder.mockReturnValue({ data: null, error: { message: 'Database error' } });

    const result = await getConflicts();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Database error');
  });

  it('should return empty array when no conflicts exist', async () => {
    mockOrder.mockReturnValue({ data: [], error: null });

    const result = await getConflicts();

    expect(result.success).toBe(true);
    expect(result.data).toEqual([]);
  });

  it('should handle unexpected errors', async () => {
    mockOrder.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await getConflicts();

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });
});
