import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import RestrictedMarketSentimentGauge from '../RestrictedMarketSentimentGauge/RestrictedMarketSentimentGauge';
import RestrictedCompositionView from '../RestrictedCompositionView/RestrictedCompositionView';

describe('Restricted market sentiment components', () => {
  const mockOnUpgradeClick = jest.fn();

  const renderRestrictedViews = () => render(
    <I18nextProvider i18n={i18n}>
      <>
        <RestrictedMarketSentimentGauge onUpgradeClick={mockOnUpgradeClick} />
        <RestrictedCompositionView onUpgradeClick={mockOnUpgradeClick} />
      </>
    </I18nextProvider>
  );

  beforeEach(() => {
    mockOnUpgradeClick.mockClear();
  });

  it('renders both screenshot overlays with upgrade CTAs', () => {
    renderRestrictedViews();

    expect(screen.getByAltText('Sentiment Gauge Feature')).toBeInTheDocument();
    expect(screen.getByAltText('Composition Feature')).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBe(2);
  });

  it('keeps the gated layout css hooks intact', () => {
    const { container } = renderRestrictedViews();

    expect(container.querySelector('.restricted-gauge-container')).toBeInTheDocument();
    expect(container.querySelector('.feature-screenshot-background')).toBeInTheDocument();
    expect(container.querySelector('.restricted-composition-container')).toBeInTheDocument();
    expect(container.querySelector('.composition-feature-screenshot-background')).toBeInTheDocument();
  });

  it('wires upgrade actions for both restricted views', () => {
    renderRestrictedViews();

    screen.getAllByRole('button').forEach((button) => fireEvent.click(button));
    expect(mockOnUpgradeClick).toHaveBeenCalledTimes(2);
  });
});
