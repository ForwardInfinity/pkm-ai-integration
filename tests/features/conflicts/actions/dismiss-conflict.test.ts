import { describe, it, expect, vi, beforeEach } from 'vitest';
import { dismissConflict } from '@/features/conflicts/actions/dismiss-conflict';

const mockUpdate = vi.fn();
const mockEq = vi.fn();
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
              return mockEq.mock.results[mockEq.mock.calls.length - 1]?.value ?? {
                error: null,
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
    mockEq.mockReturnValue({ error: null });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
    expect(mockFrom).toHaveBeenCalledWith('conflicts');
    expect(mockUpdate).toHaveBeenCalledWith({ status: 'dismissed' });
    expect(mockEq).toHaveBeenCalledWith('id', 'conflict-1');
  });

  it('should return error when update fails', async () => {
    mockEq.mockReturnValue({ error: { message: 'Update failed' } });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toBe('Update failed');
  });

  it('should handle RLS permission errors', async () => {
    mockEq.mockReturnValue({
      error: { message: 'new row violates row-level security policy' },
    });

    const result = await dismissConflict('conflict-1');

    expect(result.success).toBe(false);
    expect(result.error).toContain('row-level security');
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
