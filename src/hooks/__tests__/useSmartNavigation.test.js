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
    act(() => jest.advanceTimersByTime(150));
    expect(result.current.isInitialized).toBe(true);
    expect(result.current.shouldUseSideNav).toBe(overflow);
    unmount();
  });
  it('skips layout reads while disabled and resumes after switching to desktop', () => {
    const readHeight = jest.fn(() => 68);
    const item = { getBoundingClientRect: () => ({ top: 0 }) };
    const { result, rerender, unmount } = renderHook(
      ({ enabled }) => useSmartNavigation({ enabled }), { initialProps: { enabled: false } }
    );
    result.current.navRef.current = {
      get offsetHeight() { return readHeight(); },
      scrollWidth: 1440, clientWidth: 1440,
      querySelectorAll: () => [item, item],
      querySelector: () => ({ scrollWidth: 900, clientWidth: 800 })
    };
    act(() => {
      result.current.triggerCheck();
      window.dispatchEvent(new Event('resize'));
      jest.advanceTimersByTime(500);
    });
    expect(readHeight).not.toHaveBeenCalled();
    rerender({ enabled: true });
    act(() => jest.advanceTimersByTime(150));
    expect(result.current.shouldUseSideNav).toBe(true);
    rerender({ enabled: false });
    expect(result.current.shouldUseSideNav).toBe(false);
    unmount();
  });

  it('listens for font changes without reading ready, and cancels pending measurements', () => {
    const originalFonts = Object.getOwnPropertyDescriptor(document, 'fonts');
    const fonts = new EventTarget();
    const ready = jest.fn(() => { throw new Error('Unexpected synchronous font flush'); });
    Object.defineProperty(fonts, 'ready', { get: ready });
    Object.defineProperty(document, 'fonts', { configurable: true, value: fonts });
    try {
      const { result, unmount } = renderHook(() => useSmartNavigation());
      const query = jest.fn(() => []);
      result.current.navRef.current = { querySelectorAll: query };
      act(() => {
        fonts.dispatchEvent(new Event('loadingdone'));
        result.current.triggerCheck();
        result.current.triggerCheck();
        jest.advanceTimersByTime(150);
      });
      expect(ready).not.toHaveBeenCalled();
      expect(query).toHaveBeenCalledTimes(1);
      act(() => {
        fonts.dispatchEvent(new Event('loadingdone'));
        jest.advanceTimersByTime(100);
      });
      unmount();
      act(() => jest.advanceTimersByTime(500));
      expect(query).toHaveBeenCalledTimes(1);
    } finally {
      if (originalFonts) Object.defineProperty(document, 'fonts', originalFonts);
      else delete document.fonts;
    }
  });

});
