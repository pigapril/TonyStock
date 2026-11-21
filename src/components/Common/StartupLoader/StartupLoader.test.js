import React from 'react';
import { act, render, screen } from '@testing-library/react';
import StartupLoader from './StartupLoader';

describe('StartupLoader', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders an accessible branded status and reveals it only after the short delay', () => {
    jest.useFakeTimers();
    const { container } = render(<StartupLoader />);

    const status = screen.getByRole('status');
    expect(status).toHaveAttribute('aria-busy', 'true');
    expect(status).toHaveAttribute('aria-label', 'Loading Sentiment Inside Out');
    expect(container.querySelector('img[alt="Sentiment Inside Out"]')).toBeInTheDocument();
    expect(screen.queryByText('MARKET INSIGHTS')).not.toBeInTheDocument();
    expect(status).not.toHaveClass('startup-loader--visible');

    act(() => {
      jest.advanceTimersByTime(150);
    });

    expect(status).toHaveClass('startup-loader--visible');
  });

  it('clears the reveal timer when unmounted before the delay', () => {
    jest.useFakeTimers();
    const { unmount } = render(<StartupLoader />);

    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
