import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RouteLocaleGate from './RouteLocaleGate';
import { loadRouteLocales } from '../../../locales/loadRouteLocales';
import { getInitialLanguage } from '../../../locales/resourceGroups';

jest.mock('../../../locales/loadRouteLocales', () => ({ loadRouteLocales: jest.fn() }));
const mockI18n = { language: 'en', changeLanguage: jest.fn(async lang => { mockI18n.language = lang; }) };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: mockI18n, t: key => key }) }));
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const view = (lang, pathname) => <RouteLocaleGate lang={lang} pathname={pathname} fallback={<div>waiting</div>}><div>page</div></RouteLocaleGate>;

beforeEach(() => {
  jest.clearAllMocks();
  mockI18n.language = 'en';
  mockI18n.changeLanguage.mockImplementation(async lang => { mockI18n.language = lang; });
});

test.each(['/en/', '/en/articles'])('bundled copy renders synchronously without a placeholder for %s', pathname => {
  loadRouteLocales.mockReturnValue(new Promise(() => {}));
  render(view('en', pathname));
  expect(screen.getByText('page')).toBeInTheDocument();
  expect(screen.queryByText('waiting')).not.toBeInTheDocument();
  expect(loadRouteLocales).not.toHaveBeenCalled();
});

test('Chinese homepage also renders immediately when its language is active', () => {
  mockI18n.language = 'zh-TW';
  render(view('zh-TW', '/zh-TW/'));
  expect(screen.getByText('page')).toBeInTheDocument();
  expect(loadRouteLocales).not.toHaveBeenCalled();
});

test.each(['zh-TW', 'zh-HK', 'en-US', 'ja-JP'])('root entry with browser language %s paints the homepage without a short placeholder', browserLanguage => {
  mockI18n.language = getInitialLanguage('/', browserLanguage);
  const redirectLanguage = getInitialLanguage('/', browserLanguage);
  loadRouteLocales.mockReturnValue(new Promise(() => {}));
  render(view(redirectLanguage, `/${redirectLanguage}/`));
  expect(screen.getByText('page')).toBeInTheDocument();
  expect(screen.queryByText('waiting')).not.toBeInTheDocument();
  expect(loadRouteLocales).not.toHaveBeenCalled();
});

test('deep-linked page mounts only after its translations and language are ready', async () => {
  const pending = deferred();
  loadRouteLocales.mockReturnValue(pending.promise);
  render(view('zh-TW', '/zh-TW/momentum'));
  expect(screen.queryByText('page')).not.toBeInTheDocument();
  await act(async () => pending.resolve());
  expect(screen.getByText('page')).toBeInTheDocument();
  expect(mockI18n.language).toBe('zh-TW');
});

test('a stale route request cannot switch language or release a newer route', async () => {
  const first = deferred(); const second = deferred();
  loadRouteLocales.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
  const { rerender } = render(view('zh-TW', '/zh-TW/momentum'));
  rerender(view('en', '/en/market-sentiment'));
  await act(async () => first.resolve());
  expect(screen.queryByText('page')).not.toBeInTheDocument();
  expect(mockI18n.changeLanguage).not.toHaveBeenCalled();
  await act(async () => second.resolve());
  expect(screen.getByText('page')).toBeInTheDocument();
});

test('a failed translation download offers retry and recovers', async () => {
  loadRouteLocales.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce([]);
  render(view('en', '/en/momentum'));
  const button = await screen.findByRole('button', { name: 'common.retry' });
  expect(screen.getByRole('alert')).toHaveTextContent('common.errorLoading');
  fireEvent.click(button);
  await waitFor(() => expect(screen.getByText('page')).toBeInTheDocument());
});
