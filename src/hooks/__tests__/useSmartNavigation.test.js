import { act, renderHook } from '@testing-library/react';
import useSmartNavigation from '../useSmartNavigation';

describe('useSmartNavigation overflow', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it.each([false, true])('detects inner navigation overflow on the first check: %s', (overflow) => {
    const { result, unmount } = renderHook(() => useSmartNavigation());
    const item = { getBoundingClientRect: () => ({ top: 0 }) };
    result.current.navRef.current = {
      offsetHeight: 68,
      scrollWidth: 1440,
      clientWidth: 1440,
      querySelectorAll: () => [item, item],
      querySelector: () => ({ scrollWidth: overflow ? 900 : 800, clientWidth: 800 })
    };
    act(() => jest.advanceTimersByTime(100));
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.shouldUseSideNav).toBe(overflow);
    unmount();
  });
});
