import React from 'react';
import { act, render, screen } from '@testing-library/react';
import { createInstance } from 'i18next';
import { I18nextProvider } from 'react-i18next';
import { AuthDialog } from './AuthDialog';
import en from '../../locales/en/translation.json';
import zhTW from '../../locales/zh-TW/translation.json';

const mockDialog = { isOpen: true, type: 'auth' };
const mockCloseDialog = jest.fn();
const mockRenderGoogleButton = jest.fn();
const mockEnsureGoogleIdentityLoaded = jest.fn();
jest.mock('../Common/Dialog/useDialog', () => ({
  useDialog: () => ({ dialog: mockDialog, closeDialog: mockCloseDialog })
}));
jest.mock('./useAuth', () => ({
  useAuth: () => ({
    loading: false, user: null,
    renderGoogleButton: mockRenderGoogleButton,
    ensureGoogleIdentityLoaded: mockEnsureGoogleIdentityLoaded
  })
}));
jest.mock('../../utils/analytics', () => ({
  Analytics: { ui: { dialog: { open: jest.fn() } }, auth: { login: jest.fn() } }
}));

test('an open login dialog selects the artwork for the current language, including the Chinese alias', async () => {
  const i18n = createInstance();
  await i18n.init({
    lng: 'en', fallbackLng: { zh: ['zh-TW'], default: ['en'] },
    resources: { en: { translation: en }, 'zh-TW': { translation: zhTW } },
    interpolation: { escapeValue: false }
  });
  render(<I18nextProvider i18n={i18n}><AuthDialog /></I18nextProvider>);
  const dialog = screen.getByRole('dialog');
  expect(dialog).toHaveClass('auth-entry-dialog--en');

  await act(async () => { await i18n.changeLanguage('zh-TW'); });
  expect(screen.getByRole('dialog')).toBe(dialog);
  expect(dialog).toHaveClass('auth-entry-dialog--zh-TW');
  expect(dialog).not.toHaveClass('auth-entry-dialog--en');

  await act(async () => { await i18n.changeLanguage('zh'); });
  expect(dialog).toHaveClass('auth-entry-dialog--zh-TW');
  await act(async () => { await i18n.changeLanguage('en'); });
  expect(dialog).toHaveClass('auth-entry-dialog--en');
});
