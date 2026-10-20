import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { usePolling } from './usePolling';

function setHidden(hidden: boolean) {
  Object.defineProperty(document, 'hidden', { value: hidden, configurable: true });
  document.dispatchEvent(new Event('visibilitychange'));
}

describe('usePolling', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    setHidden(false);
  });

  it('ticks on the interval while the tab is visible', () => {
    const tick = vi.fn();
    renderHook(() => usePolling(tick, 1000));
    vi.advanceTimersByTime(3000);
    expect(tick).toHaveBeenCalledTimes(3);
  });

  it('pauses in a background tab and refreshes on return', () => {
    const tick = vi.fn();
    renderHook(() => usePolling(tick, 1000));
    setHidden(true);
    vi.advanceTimersByTime(5000);
    expect(tick).not.toHaveBeenCalled();
    setHidden(false);
    expect(tick).toHaveBeenCalledTimes(1);
  });

  it('stops after unmount and when disabled', () => {
    const tick = vi.fn();
    const { unmount } = renderHook(() => usePolling(tick, 1000));
    unmount();
    renderHook(() => usePolling(tick, 1000, false));
    vi.advanceTimersByTime(5000);
    expect(tick).not.toHaveBeenCalled();
  });
});
