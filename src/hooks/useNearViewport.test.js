import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { useNearViewport } from './useNearViewport';

let observers;
const originalObserver = global.IntersectionObserver;
beforeEach(() => {
  observers = [];
  global.IntersectionObserver = jest.fn(callback => {
    const observer = { callback, observe: jest.fn(), disconnect: jest.fn() };
    observers.push(observer);
    return observer;
  });
});
afterEach(() => { global.IntersectionObserver = originalObserver; });
const Section = ({ name }) => {
  const [ref, ready] = useNearViewport();
  return <section ref={ref} data-testid={name}>{ready ? 'loaded' : 'waiting'}</section>;
};

test('sections stay unloaded until approached, and load independently only once', () => {
  const { unmount } = render(<><Section name="history" /><Section name="price" /></>);
  expect(screen.getByTestId('history')).toHaveTextContent('waiting');
  expect(screen.getByTestId('price')).toHaveTextContent('waiting');
  act(() => observers[0].callback([{ isIntersecting: false }]));
  expect(screen.getByTestId('history')).toHaveTextContent('waiting');
  act(() => observers[0].callback([{ isIntersecting: true }]));
  expect(screen.getByTestId('history')).toHaveTextContent('loaded');
  expect(screen.getByTestId('price')).toHaveTextContent('waiting');
  expect(observers[0].disconnect).toHaveBeenCalled();
  unmount();
  expect(observers[1].disconnect).toHaveBeenCalled();
});

test('unsupported browsers can still access all content', () => {
  delete global.IntersectionObserver;
  render(<Section name="history" />);
  expect(screen.getByTestId('history')).toHaveTextContent('loaded');
});
