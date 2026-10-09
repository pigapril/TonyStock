import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreeTrialFlow from './FreeTrialFlow';
import { trackProductEvent } from '../../../utils/productAnalytics';

const mockStartFreeTrial = jest.fn();
const mockRefreshUserPlan = jest.fn();
const mockRefreshSubscriptionHistory = jest.fn();
const mockCheckAuthStatus = jest.fn();

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
  useNavigate: () => jest.fn(),
  useParams: () => ({ lang: 'zh-TW' })
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } })
}));
jest.mock('../../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));

describe('免綁卡試用頁', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStartFreeTrial.mockResolvedValue({ subscriptionId: 'trial_1' });
  });

  it('成功後更新帳號與方案，並顯示不會自動扣款的確認', async () => {
    render(<FreeTrialFlow />);
    expect(screen.getByText('freeTrial.disclosure.noCard')).toBeInTheDocument();
    expect(screen.getByText('freeTrial.disclosure.expiry')).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'freeTrial.start' }));

    await waitFor(() => expect(screen.getByText('freeTrial.successBody')).toBeInTheDocument());
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
});
