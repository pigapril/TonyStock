import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Home } from './Home';
import { useAuth } from '../Auth/useAuth';
import { fetchFreeTrialEligibility } from '../../services/freeTrialService';

jest.mock('../Auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: jest.fn() }) }));
jest.mock('../../services/freeTrialService', () => ({ fetchFreeTrialEligibility: jest.fn() }));
jest.mock('../../services/homepageService', () => ({
  __esModule: true,
  default: { getHomepageHeroData: jest.fn().mockResolvedValue({}) }
}));
jest.mock('../../hooks/useDeferredFeature', () => ({ useDeferredFeature: () => false }));
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      'home.hero.primaryAuthenticated': '查看市場情緒',
      'home.hero.primaryFreeTrial': '免費試用30天 Pro 方案',
      'home.hero.primaryGuest': '登入查看市場情緒'
    }[key] || key),
    i18n: { language: 'zh-TW' }
  })
}));
jest.mock('../PageContainer/PageContainer', () => ({
  __esModule: true,
  default: ({ children }) => <>{children}</>
}));
jest.mock('../MarketSentimentIndex/MarketSentimentGauge', () => ({
  __esModule: true,
  default: () => <div />
}));

beforeEach(() => {
  global.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
  jest.clearAllMocks();
});

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>);

test('符合試用資格的登入用戶可從首頁前往訂閱頁', async () => {
  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 1, email: 'trial@example.com' } });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: true });

  renderHome();

  const trialLink = await screen.findByRole('link', { name: '免費試用30天 Pro 方案' });
  expect(trialLink.getAttribute('href')).toBe('/zh-TW/subscription-plans');
});

test('無試用資格的登入用戶保留市場情緒入口', async () => {
  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 2, email: 'used@example.com' } });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: false });

  renderHome();

  await waitFor(() => expect(fetchFreeTrialEligibility).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('link', { name: '查看市場情緒' }).getAttribute('href')).toBe('/zh-TW/market-sentiment');
});

test('訪客不查詢試用資格', () => {
  useAuth.mockReturnValue({ isAuthenticated: false, user: null });

  renderHome();

  expect(screen.getByRole('button', { name: '登入查看市場情緒' })).toBeInTheDocument();
  expect(fetchFreeTrialEligibility).not.toHaveBeenCalled();
});
