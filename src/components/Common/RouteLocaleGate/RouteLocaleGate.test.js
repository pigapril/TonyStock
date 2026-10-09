import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import RouteLocaleGate from './RouteLocaleGate';
import { loadRouteLocales } from '../../../locales/loadRouteLocales';

jest.mock('../../../locales/loadRouteLocales', () => ({ loadRouteLocales: jest.fn() }));
const mockI18n = { language: 'en', changeLanguage: jest.fn(async lang => { mockI18n.language = lang; }) };
jest.mock('react-i18next', () => ({ useTranslation: () => ({ i18n: mockI18n, t: key => key }) }));
const deferred = () => { let resolve; let reject; const promise = new Promise((yes, no) => { resolve = yes; reject = no; }); return { promise, resolve, reject }; };
const view = (lang, pathname) => <RouteLocaleGate lang={lang} pathname={pathname} fallback={<div>waiting</div>}><div>page</div></RouteLocaleGate>;

beforeEach(() => {
  mockI18n.language = 'en';
  mockI18n.changeLanguage.mockImplementation(async lang => { mockI18n.language = lang; });
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
