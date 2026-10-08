import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SentimentHistoryExamples from '../SentimentHistoryExamples';
import snapshot from '../data/usSentimentHistoryExamples.json';
import { HISTORICAL_LOW_POINT_RULE } from '../../MarketSentimentIndex/historicalLowPointUtils';

let mockLanguage = 'zh-TW';
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key, vars = {}) => {
      const strings = mockLanguage === 'en'
        ? require('../../../locales/en/translation.json')
        : require('../../../locales/zh-TW/translation.json');
      const value = key.split('.').reduce((node, part) => node?.[part], strings);
      if (typeof value !== 'string') throw new Error(`Missing copy: ${key}`);
      return value.replace(/\{\{(\w+)\}\}/g, (_, name) => String(vars[name]));
    }
  })
}));

it.each(['zh-TW', 'en'])('shows real historical cases with a visible product link (%s)', language => {
  mockLanguage = language;
  render(<MemoryRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <SentimentHistoryExamples lang={language} />
  </MemoryRouter>);
  expect(screen.getByRole('img')).toHaveAccessibleName(/2020/);
  const secondCase = screen.getByRole('button', { name: /2022/ });
  expect(secondCase).toHaveAttribute('aria-pressed', 'false');
  fireEvent.click(secondCase);
  expect(secondCase).toHaveAttribute('aria-pressed', 'true');
  expect(screen.getByRole('img')).toHaveAccessibleName(/2022/);
  expect(screen.getByRole('img')).not.toHaveAccessibleName(/2020/);
  expect(screen.getByRole('link')).toHaveAttribute('href', `/${language}/market-sentiment`);
  expect(screen.getByText(language === 'en' ? /marked in hindsight/ : /事後標記/)).toBeInTheDocument();
  expect(screen.getByText(language === 'en' ? /Pro adds the latest sentiment/ : /升級 Pro，掌握最新情緒/)).toBeInTheDocument();
});

it('ships only fixed historical data, with valid dates, scores and prices', () => {
  expect(snapshot.archivalCutoff).toBe('2023-12-31');
  expect(snapshot.markerRule).toMatchObject(HISTORICAL_LOW_POINT_RULE);
  expect(snapshot.cases.map(item => item.id)).toEqual(['pandemic', 'tightening']);
  expect(snapshot.cases.reduce((count, item) => count + item.points.length, 0)).toBeLessThan(600);
  for (const example of snapshot.cases) {
    expect(example.points.length).toBeGreaterThan(100);
    expect(example.markers.length).toBeGreaterThan(0);
    example.points.forEach(point => {
      expect(point.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(point.date))).toBe(false);
      expect(point.date >= example.start && point.date <= example.end).toBe(true);
      expect(point.date <= '2023-12-31').toBe(true);
      expect(Number.isFinite(point.compositeScore)).toBe(true);
      expect(point.compositeScore).toBeGreaterThanOrEqual(0);
      expect(point.compositeScore).toBeLessThanOrEqual(100);
      expect(Number.isFinite(point.spyClose)).toBe(true);
      expect(point.spyClose).toBeGreaterThan(0);

    });
    for (let index = 1; index < example.points.length; index += 1) {
      expect(example.points[index].date > example.points[index - 1].date).toBe(true);
    }
    for (const marker of example.markers) {
      expect(example.points).toContainEqual(marker);
      expect(marker.compositeScore).toBeLessThanOrEqual(snapshot.markerRule.referenceThreshold);
      const neighbours = example.points.filter(point => Math.abs(Date.parse(point.date) - Date.parse(marker.date)) <= 45 * 86400000);
      expect(neighbours.every(point => point.compositeScore >= marker.compositeScore)).toBe(true);
    }
  }
});

it('retains the early 2022 fear event and subsequent lower prices, rather than showing only a successful bottom', () => {
  const example = snapshot.cases.find(item => item.id === 'tightening');
  const firstMarker = example.markers[0];
  expect(firstMarker.date).toBe('2022-07-05');
  expect(example.points.some(point => point.date > firstMarker.date && point.spyClose < firstMarker.spyClose)).toBe(true);
  expect(example.markers.map(point => point.date)).toEqual(['2022-07-05', '2022-10-03', '2022-12-30']);
});
