import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import RestrictedMarketSentimentGauge from '../RestrictedMarketSentimentGauge/RestrictedMarketSentimentGauge';

const renderWithI18n = (component) => render(
  <I18nextProvider i18n={i18n}>
    {component}
  </I18nextProvider>
);

describe('RestrictedMarketSentimentGauge', () => {
  it('renders the screenshot-backed paywall shell', () => {
    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={jest.fn()} />);

    expect(screen.getByAltText('Sentiment Gauge Feature')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(document.querySelector('.lock-icon')).toBeInTheDocument();
  });

  it('forwards upgrade clicks', () => {
    const onUpgradeClick = jest.fn();

    renderWithI18n(<RestrictedMarketSentimentGauge onUpgradeClick={onUpgradeClick} />);
    fireEvent.click(screen.getByRole('button'));

    expect(onUpgradeClick).toHaveBeenCalledTimes(1);
  });
});
