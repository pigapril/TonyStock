import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import MarketSentimentGauge from '../MarketSentimentGauge';

const mockSentimentData = {
  totalScore: 75,
  compositeScoreLastUpdate: '2024-01-15T10:30:00Z'
};

const renderWithI18n = (component) => render(
  <I18nextProvider i18n={i18n}>
    {component}
  </I18nextProvider>
);

describe('MarketSentimentGauge', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    window.matchMedia = jest.fn().mockImplementation((query) => ({
      matches: query === '(prefers-reduced-motion: reduce)' ? false : false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn()
    }));
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('renders score, svg gauge, and localized update metadata', () => {
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
      />
    );

    expect(screen.getByTestId('msi-arc-gauge-svg')).toBeInTheDocument();
    expect(screen.getByText('75')).toBeInTheDocument();
    expect(screen.getByText(/當前美股市場情緒|Current US market sentiment/i)).toBeInTheDocument();
  });

  it('renders loading and invalid-data states', () => {
    const { rerender } = renderWithI18n(
      <MarketSentimentGauge
        sentimentData={null}
        isDataLoaded={false}
      />
    );

    expect(screen.getByText(/載入中|Loading/i)).toBeInTheDocument();

    rerender(
      <I18nextProvider i18n={i18n}>
        <MarketSentimentGauge
          sentimentData={{ totalScore: null }}
          isDataLoaded={true}
        />
      </I18nextProvider>
    );

    expect(screen.getByText(/數據載入失敗|Invalid Data/i)).toBeInTheDocument();
  });

  it('respects display flags and supports segment interaction', async () => {
    renderWithI18n(
      <MarketSentimentGauge
        sentimentData={mockSentimentData}
        isDataLoaded={true}
        showAnalysisResult={false}
        showLastUpdate={false}
      />
    );

    expect(screen.queryByText(/最後更新|Last Update/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/當前美股市場情緒|Current US market sentiment/i)).toBeInTheDocument();

    jest.advanceTimersByTime(1200);

    const firstSegment = screen.getAllByRole('button')[0];
    fireEvent.mouseEnter(firstSegment, { clientX: 100, clientY: 100 });
    jest.runOnlyPendingTimers();

    await waitFor(() => {
      expect(document.querySelector('.msiArcGauge__tooltip')).toBeInTheDocument();
    });
  });
});
