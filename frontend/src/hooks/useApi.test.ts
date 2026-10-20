import { act, renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useApi } from './useApi';

describe('useApi', () => {
  it('loads data and clears the loading flag', async () => {
    const { result } = renderHook(() => useApi(() => Promise.resolve([1, 2]), []));
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.data).toEqual([1, 2]);
    expect(result.current.error).toBeNull();
  });

  it('turns a failure into a readable error and retries on reload', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce('ok');
    const { result } = renderHook(() => useApi(fetcher, [], { errorFallback: 'Не удалось' }));
    await waitFor(() => expect(result.current.error).toBe('Не удалось'));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.data).toBe('ok'));
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it('ignores a stale response after the parameters change', async () => {
    let resolveFirst: (v: string) => void = () => {};
    const fetcher = vi
      .fn()
      .mockImplementationOnce(() => new Promise<string>((r) => (resolveFirst = r)))
      .mockResolvedValueOnce('second');
    const { result, rerender } = renderHook(({ q }) => useApi(fetcher, [q]), { initialProps: { q: 'a' } });
    rerender({ q: 'b' });
    await waitFor(() => expect(result.current.data).toBe('second'));
    act(() => resolveFirst('first'));
    expect(result.current.data).toBe('second');
  });

  it('does not request while disabled', () => {
    const fetcher = vi.fn().mockResolvedValue(1);
    const { result } = renderHook(() => useApi(fetcher, [], { enabled: false }));
    expect(fetcher).not.toHaveBeenCalled();
    expect(result.current.loading).toBe(false);
  });

  it('applies local mutations', async () => {
    const { result } = renderHook(() => useApi(() => Promise.resolve([1]), []));
    await waitFor(() => expect(result.current.data).toEqual([1]));
    act(() => result.current.mutate((prev) => [...(prev ?? []), 2]));
    expect(result.current.data).toEqual([1, 2]);
  });
});

describe('useApi reload', () => {
  it('refreshes in the background without dropping the data on screen', async () => {
    let n = 0;
    const { result } = renderHook(() => useApi(() => Promise.resolve(++n), []));
    await waitFor(() => expect(result.current.data).toBe(1));
    act(() => result.current.reload());
    expect(result.current.loading).toBe(false);
    expect(result.current.refreshing).toBe(true);
    expect(result.current.data).toBe(1);
    await waitFor(() => expect(result.current.data).toBe(2));
    expect(result.current.refreshing).toBe(false);
  });
});
