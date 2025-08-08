import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import MarketSentimentDescriptionSection from '../MarketSentimentDescriptionSection';

// Mock data for testing
const mockIndicatorsData = {
  'AAII Bull-Bear Spread': { percentileRank: 25 },
  'CBOE Put/Call Ratio 5-Day Avg': { percentileRank: 75 },
  'Market Momentum': { percentileRank: 50 },
  'VIX MA50': { percentileRank: 30 },
  'Safe Haven Demand': { percentileRank: 60 },
  'Junk Bond Spread': { percentileRank: 40 },
  'S&P 500 COT Index': { percentileRank: 80 },
  'NAAIM Exposure Index': { percentileRank: 20 }
};

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('MarketSentimentDescriptionSection', () => {
  test('renders with default props', () => {
    renderWithI18n(
      <MarketSentimentDescriptionSection
        activeIndicator="composite"
        currentView="latest"
        indicatorsData={mockIndicatorsData}
      />
    );

    // Check if the component renders
    expect(screen.getByRole('button', { name: /overview/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /components/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /usage tips/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /historical analysis/i })).toBeInTheDocument();
  });

  test('switches tabs correctly', () => {
    renderWithI18n(
      <MarketSentimentDescriptionSection
        activeIndicator="composite"
        currentView="latest"
        indicatorsData={mockIndicatorsData}
      />
    );

    // Initially overview tab should be active
    expect(screen.getByRole('button', { name: /overview/i })).toHaveClass('active');

    // Click on components tab
    fireEvent.click(screen.getByRole('button', { name: /components/i }));
    expect(screen.getByRole('button', { name: /components/i })).toHaveClass('active');
    expect(screen.getByRole('button', { name: /overview/i })).not.toHaveClass('active');
  });

  test('displays composite content for composite indicator', () => {
    renderWithI18n(
      <MarketSentimentDescriptionSection
        activeIndicator="composite"
        currentView="latest"
        indicatorsData={mockIndicatorsData}
      />
    );

    // Should show composite overview content
    expect(screen.getByText(/SIO恐懼貪婪指標|SIO Fear & Greed Index/i)).toBeInTheDocument();
  });

  test('displays individual indicator content for specific indicator', () => {
    renderWithI18n(
      <MarketSentimentDescriptionSection
        activeIndicator="AAII Bull-Bear Spread"
        currentView="latest"
        indicatorsData={mockIndicatorsData}
      />
    );

    // Click on components tab to see individual indicator content
    fireEvent.click(screen.getByRole('button', { name: /components/i }));
    
    // Should show individual indicator content
    expect(screen.getByText(/calculation|計算方法/i)).toBeInTheDocument();
    expect(screen.getByText(/interpretation|指標解讀/i)).toBeInTheDocument();
    expect(screen.getByText(/data source|數據來源/i)).toBeInTheDocument();
  });

  test('renders all indicator summaries for composite view', () => {
    renderWithI18n(
      <MarketSentimentDescriptionSection
        activeIndicator="composite"
        currentView="latest"
        indicatorsData={mockIndicatorsData}
      />
    );

    // Click on components tab
    fireEvent.click(screen.getByRole('button', { name: /components/i }));
    
    // Should show all indicator summaries
    expect(screen.getByText(/SIO恐懼貪婪指標|SIO Fear & Greed Index/i)).toBeInTheDocument();
  });
});