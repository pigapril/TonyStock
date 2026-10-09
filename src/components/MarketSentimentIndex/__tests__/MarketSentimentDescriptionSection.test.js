import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import marketEn from '../../../locales/resources/en/market.json';
import marketZhTW from '../../../locales/resources/zh-TW/market.json';
import MarketSentimentDescriptionSection from '../MarketSentimentDescriptionSection';

// market chunk is loaded lazily in production; inject it for tests.
beforeAll(() => {
  i18n.addResourceBundle('en', 'translation', marketEn, true, true);
  i18n.addResourceBundle('zh-TW', 'translation', marketZhTW, true, true);
});

const renderWithI18n = (component) => render(
  <I18nextProvider i18n={i18n}>
    {component}
  </I18nextProvider>
);

describe('MarketSentimentDescriptionSection', () => {
  it('renders the FAQ shell for the active indicator', () => {
    renderWithI18n(<MarketSentimentDescriptionSection activeIndicator="composite" />);

    expect(screen.getByRole('heading', { name: 'FAQ' })).toBeInTheDocument();
    expect(screen.getAllByRole('button').length).toBeGreaterThan(0);
  });

  it('expands and collapses faq answers', () => {
    renderWithI18n(<MarketSentimentDescriptionSection activeIndicator="AAII Bull-Bear Spread" />);

    const firstQuestion = screen.getAllByRole('button')[0];
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(firstQuestion);
    expect(firstQuestion).toHaveAttribute('aria-expanded', 'false');
  });
});
