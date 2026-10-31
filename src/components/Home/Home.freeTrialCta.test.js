import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { Home } from './Home';
import { useAuth } from '../Auth/useAuth';
import { fetchFreeTrialEligibility } from '../../services/freeTrialService';
import { trackProductEvent } from '../../utils/productAnalytics';
import homepageService from '../../services/homepageService';

const mockOpenDialog = jest.fn();
const mockDialog = { isOpen: false, type: null };

jest.mock('../Auth/useAuth', () => ({ useAuth: jest.fn() }));
jest.mock('../Common/Dialog/useDialog', () => ({ useDialog: () => ({ openDialog: mockOpenDialog, dialog: mockDialog }) }));
jest.mock('../../services/freeTrialService', () => ({ fetchFreeTrialEligibility: jest.fn() }));
jest.mock('../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));
jest.mock('../../services/homepageService', () => ({
  __esModule: true,
  default: {
    getHomepageHeroData: jest.fn().mockResolvedValue({}),
    getHomepageNarrativeData: jest.fn().mockResolvedValue({}),
    getHomepagePriceData: jest.fn().mockResolvedValue({})
  }
}));
jest.mock('react-responsive', () => ({ useMediaQuery: () => false }));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => ({
      'home.hero.primaryAuthenticated': '查看市場情緒',
      'home.hero.primaryFreeTrial': '免綁卡免費試用 Pro 30 天',
      'home.hero.primaryGuest': '免綁卡免費試用 Pro 30 天',
      'home.hero.secondary': '免費分析個股趨勢',
      'home.hero.trialLoginTitle': '登入以開始 Pro 試用',
      'home.hero.trialLoginPrompt': '登入後，符合資格即可開始 Pro 30 天免費試用。'
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

let viewportObservers;
beforeEach(() => {
  viewportObservers = [];
  global.IntersectionObserver = class {
    constructor(callback) { this.callback = callback; viewportObservers.push(this); }
    observe(target) { this.target = target; }
    unobserve() {}
    disconnect() {}
  };
  jest.clearAllMocks();
  homepageService.getHomepageHeroData.mockResolvedValue({});
  homepageService.getHomepageNarrativeData.mockResolvedValue({});
  homepageService.getHomepagePriceData.mockResolvedValue({});
});

const renderHome = () => render(<MemoryRouter><Home /></MemoryRouter>);

function LocationDisplay() {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
}

const renderHomeWithLocation = () => render(
  <MemoryRouter initialEntries={['/zh-TW/']}>
    <Home />
    <LocationDisplay />
  </MemoryRouter>
);

test('符合試用資格的登入用戶可從首頁直接開始試用流程', async () => {
  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 1, email: 'trial@example.com' } });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: true });

  renderHome();

  const trialLink = await screen.findByRole('link', { name: '免綁卡免費試用 Pro 30 天' });
  expect(trialLink.getAttribute('href')).toBe('/zh-TW/payment/free-trial');
  trialLink.click();
  expect(trackProductEvent).toHaveBeenCalledWith('free_trial_home_clicked', {
    source: 'home', trial_days: 30
  });
});

test('無試用資格的登入用戶保留市場情緒入口', async () => {
  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 2, email: 'used@example.com' } });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: false });

  renderHome();

  await waitFor(() => expect(fetchFreeTrialEligibility).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('link', { name: '查看市場情緒' }).getAttribute('href')).toBe('/zh-TW/market-sentiment');
});

test('訪客看到試用入口，登入後符合資格會直接進入試用流程', async () => {
  useAuth.mockReturnValue({ isAuthenticated: false, user: null });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: true });

  const view = renderHomeWithLocation();

  const trialButton = screen.getByRole('button', { name: '免綁卡免費試用 Pro 30 天' });
  expect(screen.getByRole('link', { name: '免費分析個股趨勢' })).toBeInTheDocument();
  expect(fetchFreeTrialEligibility).not.toHaveBeenCalled();

  fireEvent.click(trialButton);
  expect(mockOpenDialog).toHaveBeenCalledWith('auth', {
    customTitle: '登入以開始 Pro 試用',
    customDescription: '登入後，符合資格即可開始 Pro 30 天免費試用。'
  });
  expect(trackProductEvent).toHaveBeenCalledWith('free_trial_home_clicked', {
    source: 'home', trial_days: 30
  });

  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 3, email: 'new@example.com' } });
  view.rerender(
    <MemoryRouter initialEntries={['/zh-TW/']}>
      <Home />
      <LocationDisplay />
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/zh-TW/payment/free-trial'));
});

test('登入後沒有試用資格時導向方案頁', async () => {
  useAuth.mockReturnValue({ isAuthenticated: false, user: null });
  fetchFreeTrialEligibility.mockResolvedValue({ eligible: false });

  const view = renderHomeWithLocation();
  fireEvent.click(screen.getByRole('button', { name: '免綁卡免費試用 Pro 30 天' }));

  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 4, email: 'used@example.com' } });
  view.rerender(
    <MemoryRouter initialEntries={['/zh-TW/']}>
      <Home />
      <LocationDisplay />
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/zh-TW/subscription-plans'));
});

test('登入後無法確認試用資格時導向方案頁', async () => {
  useAuth.mockReturnValue({ isAuthenticated: false, user: null });
  fetchFreeTrialEligibility.mockRejectedValue(new Error('eligibility unavailable'));

  const view = renderHomeWithLocation();
  fireEvent.click(screen.getByRole('button', { name: '免綁卡免費試用 Pro 30 天' }));

  useAuth.mockReturnValue({ isAuthenticated: true, user: { id: 5, email: 'unknown@example.com' } });
  view.rerender(
    <MemoryRouter initialEntries={['/zh-TW/']}>
      <Home />
      <LocationDisplay />
    </MemoryRouter>
  );

  await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/zh-TW/subscription-plans'));
});


test('首頁資料隨各區塊接近畫面才載入，另一區塊不會提前載入或重複請求', async () => {
  useAuth.mockReturnValue({ isAuthenticated: false, user: null });
  renderHome();
  await waitFor(() => expect(homepageService.getHomepageHeroData).toHaveBeenCalled());
  expect(homepageService.getHomepageNarrativeData).not.toHaveBeenCalled();
  expect(homepageService.getHomepagePriceData).not.toHaveBeenCalled();
  const history = viewportObservers.find(observer => observer.target?.classList.contains('home-storyBlock--sentiment'));
  const price = viewportObservers.find(observer => observer.target?.classList.contains('home-storyBlock--price'));
  act(() => history.callback([{ isIntersecting: true }]));
  await waitFor(() => expect(homepageService.getHomepageNarrativeData).toHaveBeenCalledTimes(1));
  expect(homepageService.getHomepagePriceData).not.toHaveBeenCalled();
  act(() => price.callback([{ isIntersecting: true }]));
  await waitFor(() => expect(homepageService.getHomepagePriceData).toHaveBeenCalledTimes(1));
  expect(homepageService.getHomepageNarrativeData).toHaveBeenCalledTimes(1);
});
