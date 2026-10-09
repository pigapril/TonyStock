import { act, renderHook } from '@testing-library/react';
import { useDeferredFeature } from './useDeferredFeature';

beforeEach(() => {
  jest.useFakeTimers();
  window.requestIdleCallback = jest.fn(callback => window.setTimeout(callback, 0));
  window.cancelIdleCallback = jest.fn(id => window.clearTimeout(id));
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
  delete window.requestIdleCallback;
  delete window.cancelIdleCallback;
});

test('an early idle period cannot bypass the minimum delay', () => {
  const { result } = renderHook(() => useDeferredFeature({ minDelayMs: 2500, timeoutMs: 10000, useIdleCallback: true }));
  act(() => jest.advanceTimersByTime(2499));
  expect(result.current).toBe(false);
  expect(window.requestIdleCallback).not.toHaveBeenCalled();
  act(() => jest.advanceTimersByTime(2));
  expect(result.current).toBe(true);
});

test('explicit interaction loads a needed feature early and cancels scheduled work', () => {
  const { result } = renderHook(() => useDeferredFeature({ minDelayMs: 3200, useIdleCallback: true, triggerOnInteraction: true }));
  act(() => window.dispatchEvent(new Event('pointerdown')));
  expect(result.current).toBe(true);
  act(() => jest.advanceTimersByTime(10000));
  expect(window.requestIdleCallback).not.toHaveBeenCalled();
});

test('unmount cancels an idle callback already queued', () => {
  const { unmount } = renderHook(() => useDeferredFeature({ minDelayMs: 1000, useIdleCallback: true }));
  act(() => jest.advanceTimersByTime(1000));
  unmount();
  expect(window.cancelIdleCallback).toHaveBeenCalled();
});
