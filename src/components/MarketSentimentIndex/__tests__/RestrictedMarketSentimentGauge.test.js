import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n/i18n';
import RestrictedMarketSentimentGauge from '../RestrictedMarketSentimentGauge/RestrictedMarketSentimentGauge';

const renderWithI18n = (component) => {
  return render(
    <I18nextProvider i18n={i18n}>
      {component}
    </I18nextProvider>
  );
};

describe('RestrictedMarketSentimentGauge', () => {
  test('renders restricted gauge component', () => {
    const onUpgradeClick = jest.fn();
    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={onUpgradeClick} />);
    
    expect(screen.getByText(/即時情緒儀表盤|Real-time Sentiment Gauge/)).toBeInTheDocument();
  });

  test('calls onUpgradeClick when upgrade button is clicked', () => {
    const onUpgradeClick = jest.fn();
    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={onUpgradeClick} />);
    
    const upgradeButton = screen.getByText(/立即升級|Upgrade Now/);
    fireEvent.click(upgradeButton);
    
    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });

  test('displays lock icon', () => {
    const onUpgradeClick = jest.fn();
    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={onUpgradeClick} />);
    
    const lockIcon = document.querySelector('.lock-icon');
    expect(lockIcon).toBeInTheDocument();
  });

  test('shows blurred gauge background', () => {
    const onUpgradeClick = jest.fn();
    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={onUpgradeClick} />);
    
    const blurredGauge = document.querySelector('.blurred-gauge');
    expect(blurredGauge).toBeInTheDocument();
  });
});