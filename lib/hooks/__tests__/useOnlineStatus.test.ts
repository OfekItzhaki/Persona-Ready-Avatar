import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useOnlineStatus } from '../useOnlineStatus';

describe('useOnlineStatus', () => {
  let onlineGetter: ReturnType<typeof vi.fn>;
  let addEventListenerSpy: ReturnType<typeof vi.spyOn>;
  let removeEventListenerSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    // Mock navigator.onLine
    onlineGetter = vi.fn(() => true);
    Object.defineProperty(navigator, 'onLine', {
      get: onlineGetter,
      configurable: true,
    });

    // Spy on event listeners
    addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return true when online initially', () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(true);
  });

  it('should return false when offline initially', () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());
    expect(result.current).toBe(false);
  });

  it('should add event listeners for online and offline events', () => {
    renderHook(() => useOnlineStatus());

    expect(addEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(addEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });

  it('should update to false when offline event is triggered', async () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Trigger offline event
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should update to true when online event is triggered', async () => {
    onlineGetter.mockReturnValue(false);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(false);

    // Trigger online event
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });
  });

  it('should handle multiple online/offline transitions', async () => {
    onlineGetter.mockReturnValue(true);
    const { result } = renderHook(() => useOnlineStatus());

    expect(result.current).toBe(true);

    // Go offline
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });

    // Go online
    act(() => {
      window.dispatchEvent(new Event('online'));
    });

    await waitFor(() => {
      expect(result.current).toBe(true);
    });

    // Go offline again
    act(() => {
      window.dispatchEvent(new Event('offline'));
    });

    await waitFor(() => {
      expect(result.current).toBe(false);
    });
  });

  it('should remove event listeners on unmount', () => {
    const { unmount } = renderHook(() => useOnlineStatus());

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function));
    expect(removeEventListenerSpy).toHaveBeenCalledWith('offline', expect.any(Function));
  });
});
