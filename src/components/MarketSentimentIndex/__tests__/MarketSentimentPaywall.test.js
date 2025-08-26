import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/i18n';
import MarketSentimentPaywall from '../MarketSentimentPaywall/MarketSentimentPaywall';

// Mock Analytics
jest.mock('../../../utils/analytics', () => ({
  Analytics: {
    marketSentiment: {
      paywallShown: jest.fn(),
      paywallUpgradeClicked: jest.fn(),
      paywallClosed: jest.fn()
    }
  }
}));

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('MarketSentimentPaywall', () => {
  const defaultProps = {
    isVisible: true,
    onClose: jest.fn(),
    onUpgrade: jest.fn(),
    historicalData: [],
    showHistoricalChart: false
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders paywall when visible', () => {
    renderWithI18n(<MarketSentimentPaywall {...defaultProps} />);
    
    expect(screen.getByText(/解鎖完整市場情緒分析|Unlock Complete Market Sentiment Analysis/)).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    renderWithI18n(
      <MarketSentimentPaywall {...defaultProps} isVisible={false} />
    );
    
    expect(screen.queryByText(/解鎖完整市場情緒分析|Unlock Complete Market Sentiment Analysis/)).not.toBeInTheDocument();
  });

  test('calls onUpgrade when upgrade button is clicked', () => {
    const onUpgrade = jest.fn();
    renderWithI18n(
      <MarketSentimentPaywall {...defaultProps} onUpgrade={onUpgrade} />
    );
    
    const upgradeButton = screen.getByText(/升級至 Pro 方案|Upgrade to Pro/);
    fireEvent.click(upgradeButton);
    
    expect(onUpgrade).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when close button is clicked', () => {
    const onClose = jest.fn();
    renderWithI18n(
      <MarketSentimentPaywall {...defaultProps} onClose={onClose} />
    );
    
    const closeButton = screen.getByLabelText(/關閉|close/i);
    fireEvent.click(closeButton);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('calls onClose when backdrop is clicked', () => {
    const onClose = jest.fn();
    renderWithI18n(
      <MarketSentimentPaywall {...defaultProps} onClose={onClose} />
    );
    
    const backdrop = document.querySelector('.paywall-backdrop');
    fireEvent.click(backdrop);
    
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test('shows historical chart when showHistoricalChart is true', () => {
    renderWithI18n(
      <MarketSentimentPaywall 
        {...defaultProps} 
        showHistoricalChart={true}
        historicalData={[
          { date: '2023-01-01', compositeScore: 50, spyClose: 400 }
        ]}
      />
    );
    
    expect(screen.getByText(/歷史表現預覽|Historical Performance Preview/)).toBeInTheDocument();
  });

  test('displays feature list', () => {
    renderWithI18n(<MarketSentimentPaywall {...defaultProps} />);
    
    expect(screen.getByText(/Pro 方案專享功能|Pro Plan Exclusive Features/)).toBeInTheDocument();
  });
});