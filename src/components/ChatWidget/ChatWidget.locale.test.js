import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import ChatWidget, { resolveChatWidgetLanguage } from './ChatWidget';

jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => key,
    i18n: global.__chatWidgetTestI18n || { language: 'ko-KR' },
  }),
}));
jest.mock('../Auth/useAuth', () => ({ useAuth: () => ({ user: { id: 'test-user' } }) }));
jest.mock('../../components/Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: jest.fn() }) }));
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }));
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }) => require('react').createElement('div', null, children),
}));
jest.mock('../../utils/csrfClient', () => ({
  __esModule: true,
  default: {
    fetchWithCSRF: (...args) => global.__chatWidgetFetchWithCSRF(...args),
    post: (...args) => global.__chatWidgetPost(...args),
  },
}));

describe('ChatWidget locale routing', () => {
  test.each([
    ['ko-KR', 'ko-KR'],
    ['ko', 'ko-KR'],
    ['zh-CN', 'zh-CN'],
    ['zh-Hans', 'zh-CN'],
    ['zh', 'zh-TW'],
    ['zh-TW', 'zh-TW'],
    ['zh-Hant', 'zh-TW'],
    ['en-US', 'en'],
  ])('routes %s to FAQ locale %s', (language, expected) => {
    expect(resolveChatWidgetLanguage({ language })).toBe(expected);
  });

  it('uses the selected language rather than a fallback-resolved language', () => {
    expect(resolveChatWidgetLanguage({ language: 'ko-KR', resolvedLanguage: 'en' })).toBe('ko-KR');
  });

  test.each(['zh-CN', 'ko-KR'])('sends %s to both FAQ and chat endpoints', async (locale) => {
    global.__chatWidgetTestI18n = { language: locale };
    global.__chatWidgetFetchWithCSRF = jest.fn().mockResolvedValue({
      json: async () => ({ faq: { '테스트 카테고리': { '테스트 하위 분류': { '테스트 질문?': '테스트 답변' } } } }),
    });
    global.__chatWidgetPost = jest.fn().mockResolvedValue({ json: async () => ({ reply: '응답' }) });

    const { unmount } = render(<ChatWidget />);
    fireEvent.click(screen.getByRole('button', { name: 'chatWidget.headerTitle' }));

    await waitFor(() => expect(global.__chatWidgetFetchWithCSRF).toHaveBeenCalledWith(
      `/api/chatwidget/faq/${locale}`, { method: 'GET' }
    ));

    fireEvent.change(screen.getByPlaceholderText('chatWidget.inputPlaceholder'), {
      target: { value: '테스트 메시지' },
    });
    fireEvent.keyDown(screen.getByPlaceholderText('chatWidget.inputPlaceholder'), { key: 'Enter' });

    await waitFor(() => expect(global.__chatWidgetPost).toHaveBeenCalledWith(
      '/api/chatwidget/chat',
      expect.objectContaining({ language: locale }),
      expect.objectContaining({ headers: expect.any(Object) })
    ));
    unmount();
  });
});
