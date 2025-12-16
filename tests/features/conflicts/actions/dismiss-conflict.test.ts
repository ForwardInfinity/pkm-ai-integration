import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dismissConflict } from '@/features/conflicts/actions/dismiss-conflict';

const mockUpdate = vi.fn();
const mockEq = vi.fn();
const mockSelect = vi.fn();
const mockFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockResolvedValue({
    from: (table: string) => {
      mockFrom(table);
      return {
        update: (data: Record<string, unknown>) => {
          mockUpdate(data);
          return {
            eq: (column: string, value: string) => {
              mockEq(column, value);
              const eqResult =
                mockEq.mock.results[mockEq.mock.calls.length - 1]?.value ??
                ({ data: [{ id: value }], error: null } as const);

              return {
                select: (columns: string) => {
                  mockSelect(columns);
                  return eqResult;
                },
              };
            },
          };
        },
      };
    },
  }),
}));

describe('dismissConflict', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should dismiss a conflict successfully', async () => {
    mockEq.mockReturnValue({ data: [{ id: 'conflict-1' }], error: null });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('conflicts');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'dismissed' });
    expect(mockEq).toHaveBeenCalledWith('id', 'conflict-1');
    expect(mockSelect).toHaveBeenCalledWith('id');
  });

  it('should return error when update fails', async () => {
    mockEq.mockReturnValue({ data: null, error: { message: 'Update failed' } });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Update failed');
  });

  it('should handle RLS permission errors', async () => {
    mockEq.mockReturnValue({
      data: null,
      error: { message: 'new row violates row-level security policy' },
    });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('row-level security');
  });

  it('should return error when conflict does not exist (or is not accessible)', async () => {
    mockEq.mockReturnValue({ data: [], error: null });

    const result = await dismissConflict('conflict-missing');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });

  it('should handle unexpected errors', async () => {
    mockEq.mockImplementation(() => {
      throw new Error('Unexpected error');
    });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unexpected error');
  });

  it('should handle non-Error exceptions', async () => {
    mockEq.mockImplementation(() => {
      throw 'String error';
    });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Unknown error');
  });
});
