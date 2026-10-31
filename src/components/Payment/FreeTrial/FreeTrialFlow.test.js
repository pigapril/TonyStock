import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreeTrialFlow from './FreeTrialFlow';
import { trackProductEvent } from '../../../utils/productAnalytics';

const mockStartFreeTrial = jest.fn();
const mockRefreshUserPlan = jest.fn();
const mockRefreshSubscriptionHistory = jest.fn();
const mockCheckAuthStatus = jest.fn();
const mockNavigate = jest.fn();
let mockLocation = { search: '' };

jest.mock('../../../services/freeTrialService', () => ({
  startFreeTrial: (...args) => mockStartFreeTrial(...args)
}));
jest.mock('../../Subscription/SubscriptionContext', () => ({
  useSubscription: () => ({
    refreshUserPlan: mockRefreshUserPlan,
    refreshSubscriptionHistory: mockRefreshSubscriptionHistory
  })
}));
jest.mock('../../Auth/useAuth', () => ({
  useAuth: () => ({ checkAuthStatus: mockCheckAuthStatus })
}));
jest.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => mockLocation,
  useParams: () => ({ lang: 'zh-TW' })
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } })
}));
jest.mock('../../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));

describe('免綁卡試用頁', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocation = { search: '' };
    mockStartFreeTrial.mockResolvedValue({ subscriptionId: 'trial_1' });
    mockCheckAuthStatus.mockResolvedValue(undefined);
    mockRefreshUserPlan.mockResolvedValue(undefined);
    mockRefreshSubscriptionHistory.mockResolvedValue(undefined);
  });

  it('成功後更新帳號與方案，並顯示不會自動扣款的確認', async () => {
    render(<FreeTrialFlow />);
    expect(screen.getByText('freeTrial.disclosure.noCard')).toBeInTheDocument();
    expect(screen.getByText('freeTrial.disclosure.expiry')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));

    await waitFor(() => expect(screen.getByText('freeTrial.successBody')).toBeInTheDocument());
    const celebration = document.querySelector('.card-trial__successCelebration');
    expect(celebration).toHaveAttribute('aria-hidden', 'true');
    expect(celebration.querySelectorAll('.card-trial__successSpark')).toHaveLength(6);
    expect(mockStartFreeTrial).toHaveBeenCalledTimes(1);
    expect(mockStartFreeTrial).toHaveBeenCalledWith('zh-TW');
    expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1);
    expect(mockRefreshUserPlan).toHaveBeenCalledTimes(1);
    expect(mockRefreshSubscriptionHistory).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).toHaveBeenCalledWith('free_trial_page_viewed', expect.any(Object));
    expect(trackProductEvent).toHaveBeenCalledWith('free_trial_start_clicked', expect.any(Object));
    expect(trackProductEvent).toHaveBeenCalledWith('free_trial_started', expect.any(Object));
  });

  it('資格已用過時顯示明確訊息', async () => {
    mockStartFreeTrial.mockRejectedValue({ response: { status: 409 } });
    render(<FreeTrialFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('freeTrial.errors.notEligible');
    expect(trackProductEvent).toHaveBeenCalledWith('free_trial_start_failed', expect.objectContaining({
      error_type: 'not_eligible'
    }));
    expect(trackProductEvent).not.toHaveBeenCalledWith('free_trial_started', expect.any(Object));
  });

  it('等權限刷新後才讓使用者回原股票，保留年數和回測日期', async () => {
    const returnPath = '/zh-TW/priceanalysis?stockCode=2330&years=7&backTestDate=2026-09-01';
    mockLocation.search = `?${new URLSearchParams({ returnTo: returnPath })}`;
    let finishAuthRefresh;
    mockCheckAuthStatus.mockReturnValue(new Promise(resolve => { finishAuthRefresh = resolve; }));
    render(<FreeTrialFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));
    await waitFor(() => expect(mockCheckAuthStatus).toHaveBeenCalledTimes(1));
    expect(screen.queryByRole('button', { name: 'freeTrial.resumeAnalysis' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'freeTrial.starting' })).toBeDisabled();
    await act(async () => finishAuthRefresh());
    await userEvent.click(await screen.findByRole('button', { name: 'freeTrial.resumeAnalysis' }));
    expect(mockNavigate).toHaveBeenCalledWith(returnPath, { state: { resumeAfterTrial: true } });
    expect(mockStartFreeTrial).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).toHaveBeenCalledWith('free_trial_analysis_clicked', { source: 'free_trial_page' });
  });

  it.each(['', '?returnTo=https%3A%2F%2Foutside.example'])('沒有安全原查詢時導向股票分析：%s', async (search) => {
    mockLocation.search = search;
    render(<FreeTrialFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));
    await userEvent.click(await screen.findByRole('button', { name: 'freeTrial.analyzeStock' }));
    expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/priceanalysis', { state: { resumeAfterTrial: true } });
  });

  it('刷新失敗不把已啟用的試用當成啟用失敗，也不重複啟用', async () => {
    mockRefreshSubscriptionHistory.mockRejectedValue(new Error('unavailable'));
    render(<FreeTrialFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));
    expect(await screen.findByText('freeTrial.successBody')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(mockStartFreeTrial).toHaveBeenCalledTimes(1);
    expect(trackProductEvent).not.toHaveBeenCalledWith('free_trial_start_failed', expect.any(Object));
  });

  it('試用失敗返回方案仍保留原分析', async () => {
    const query = `?${new URLSearchParams({ returnTo: '/zh-TW/priceanalysis?stockCode=AAPL&years=3.5' })}`;
    mockLocation.search = query;
    mockStartFreeTrial.mockRejectedValue({ response: { status: 409 } });
    render(<FreeTrialFlow />);
    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));
    await userEvent.click(await screen.findByRole('button', { name: 'freeTrial.goToSubscription' }));
    expect(mockNavigate).toHaveBeenCalledWith(`/zh-TW/subscription-plans${query}`);
  });
});
