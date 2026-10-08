/* eslint-disable testing-library/no-node-access, testing-library/no-container -- 比對載入前後的 DOM 節點與欄位預留，需要直接檢查版面容器。 */
import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { Link, MemoryRouter, Route, Routes } from 'react-router-dom';
import SentimentIndicatorPage from '../SentimentIndicatorPage';
import apiClient from '../../../api/apiClient';

let mockLanguage = 'en';
jest.mock('../../../api/apiClient', () => ({ get: jest.fn() }));
jest.mock('../../PageContainer/PageContainer', () => ({ children }) => <div>{children}</div>);
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: key => {
      const strings = mockLanguage === 'en'
        ? require('../../../locales/en/translation.json')
        : require('../../../locales/zh-TW/translation.json');
      return key.split('.').reduce((value, part) => value?.[part], strings) || key;
    }
  })
}));

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

const response = item => ({ data: { data: { groups: [{ items: item ? [item] : [] }] } } });
const bofaReading = {
  id: 'bofa-bull-bear', value: 8.8, date: '2026-10-02', publisher: 'Synthetic Research',
  components: { hf_positioning: 0, equity_flows: 0.82 }
};
const renderPage = (slug = 'bofa-bull-bear', suffix = '') => render(
  <MemoryRouter initialEntries={[`/${mockLanguage}/sentiment-indicators/${slug}${suffix}`]}
    future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Link to={`/${mockLanguage}/sentiment-indicators/cnn-fear-greed`}>Next indicator</Link>
    <Routes><Route path="/:lang/sentiment-indicators/:slug" element={<SentimentIndicatorPage />} /></Routes>
  </MemoryRouter>
);

beforeEach(() => {
  mockLanguage = 'en';
  apiClient.get.mockReset();
});

it.each(['en', 'zh-TW'])('keeps the reading card and component slots mounted while loading (%s)', async language => {
  mockLanguage = language;
  const request = deferred();
  apiClient.get.mockReturnValue(request.promise);
  const { container } = renderPage();
  const card = container.querySelector('.indicator-page__current');
  expect(card).not.toBeNull();
  expect(card).toHaveAttribute('aria-busy', 'true');
  const slots = [...container.querySelectorAll('.indicator-page__componentLive')];
  expect(slots).toHaveLength(6);
  expect(slots.every(slot => slot.textContent === '—')).toBe(true);

  await act(async () => request.resolve(response(bofaReading)));
  expect(container.querySelector('.indicator-page__current')).toBe(card);
  expect(card).toHaveAttribute('aria-busy', 'false');
  expect(card).toHaveTextContent('8.8');
  expect(card).toHaveTextContent('2026-10-02');
  expect([...container.querySelectorAll('.indicator-page__componentLive')]).toEqual(slots);
  expect(slots[0]).toHaveTextContent('0%');
  expect(slots[1]).toHaveTextContent('82%');
});

it.each(['empty', 'null', 'error'])('retains the card and explanation when the API returns %s', async scenario => {
  const request = deferred();
  apiClient.get.mockReturnValue(request.promise);
  const { container } = renderPage();
  const card = container.querySelector('.indicator-page__current');
  expect(card).not.toBeNull();
  await act(async () => {
    if (scenario === 'error') request.reject(new Error('Synthetic offline response'));
    else request.resolve(response(scenario === 'null' ? { ...bofaReading, value: null } : null));
  });
  expect(container.querySelector('.indicator-page__current')).toBe(card);
  expect(card).toHaveAttribute('aria-busy', 'false');
  expect(card.querySelector('.indicator-page__currentValue')).toHaveTextContent('—');
  expect(card.querySelector('.indicator-page__currentMeta')).toHaveTextContent('No data');
  expect(screen.getByRole('heading', { name: 'What is the BofA Bull & Bear Indicator?', exact: true })).toBeInTheDocument();
});

it('does not show the previous indicator while the next request is pending', async () => {
  const next = deferred();
  apiClient.get.mockResolvedValueOnce(response(bofaReading)).mockReturnValueOnce(next.promise);
  const { container } = renderPage();
  await screen.findByText('8.8');
  act(() => screen.getByRole('link', { name: 'Next indicator' }).click());
  await waitFor(() => expect(apiClient.get).toHaveBeenCalledTimes(2));
  expect(screen.queryByText('8.8')).not.toBeInTheDocument();
  expect(container.querySelector('.indicator-page__current')).toHaveAttribute('aria-busy', 'true');
  await act(async () => next.resolve(response({ id: 'cnn-fear-greed', value: 25, date: '2026-10-03' })));
  expect(container.querySelector('.indicator-page__currentValue')).toHaveTextContent('25');
});

it('ignores an old request that finishes after navigating to another indicator', async () => {
  const old = deferred();
  const next = deferred();
  apiClient.get.mockReturnValueOnce(old.promise).mockReturnValueOnce(next.promise);
  const { container } = renderPage();
  act(() => screen.getByRole('link', { name: 'Next indicator' }).click());
  await act(async () => old.resolve(response(bofaReading)));
  expect(screen.queryByText('8.8')).not.toBeInTheDocument();
  await act(async () => next.resolve(response({ id: 'cnn-fear-greed', value: 25, date: '2026-10-03' })));
  expect(container.querySelector('.indicator-page__currentValue')).toHaveTextContent('25');
});

it('does not reserve a current-reading card on a page with no live reading', () => {
  const { container } = renderPage('taiwan-fear-greed');
  expect(container.querySelector('.indicator-page__current')).not.toBeInTheDocument();
  expect(apiClient.get).not.toHaveBeenCalled();
});

it.each(['bofa-bull-bear', 'cnn-fear-greed'])('only adds the SIO history entry to the BofA article (%s)', slug => {
  apiClient.get.mockReturnValue(new Promise(() => {}));
  renderPage(slug);
  const example = screen.queryByRole('region', { name: '2020 and 2022: SIO showed extreme fear near market bottoms' });
  const shortcut = screen.queryByRole('link', { name: 'See SIO’s historical fear cases' });
  expect(Boolean(example)).toBe(slug === 'bofa-bull-bear');
  expect(Boolean(shortcut)).toBe(slug === 'bofa-bull-bear');
});

it.each(['en', 'zh-TW'].flatMap(language => ['', '/', '?source=history', '/?source=history'].map(suffix => [language, suffix])))('keeps the history shortcut on the exact current article URL (%s, %s)', (language, suffix) => {
  mockLanguage = language;
  apiClient.get.mockReturnValue(new Promise(() => {}));
  const base = document.createElement('base');
  base.href = '/';
  document.head.appendChild(base);
  try {
    renderPage('bofa-bull-bear', suffix);
    const shortcut = screen.getByRole('link', {
      name: language === 'en' ? 'See SIO’s historical fear cases' : '看看 SIO 的歷史恐慌案例'
    });
    const destination = new URL(shortcut.href);
    const currentUrl = new URL(`/${language}/sentiment-indicators/bofa-bull-bear${suffix}`, document.baseURI);
    expect(destination.pathname).toBe(currentUrl.pathname);
    expect(destination.search).toBe(currentUrl.search);
    expect(destination.hash).toBe('#sio-history-examples');
    expect(document.getElementById(destination.hash.slice(1))).toBeInTheDocument();
  } finally {
    base.remove();
  }
});
