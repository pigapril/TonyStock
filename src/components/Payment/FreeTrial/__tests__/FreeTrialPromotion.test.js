import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import FreeTrialPromotion from '../FreeTrialPromotion';

const mockNavigate = jest.fn();
const mockClaim = jest.fn();
const mockAuth = { user: { id: 'user-1', plan: 'free' } };
const mockSubscription = { userPlan: { type: 'free' } };
const mockLocation = { pathname: '/zh-TW/market-sentiment', search: '' };

jest.mock('react-router-dom', () => ({
  useLocation: () => mockLocation,
  useNavigate: () => mockNavigate
}));
jest.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key) => key, i18n: { language: 'zh-TW' } })
}));
jest.mock('../../../Auth/useAuth', () => ({ useAuth: () => mockAuth }));
jest.mock('../../../Subscription/SubscriptionContext', () => ({ useSubscription: () => mockSubscription }));
jest.mock('../../../../services/freeTrialService', () => ({
  claimFreeTrialPromotion: (...args) => mockClaim(...args)
}));
jest.mock('../../../../utils/productAnalytics', () => ({ trackProductEvent: jest.fn() }));
jest.mock('../../../Common/Dialog/Dialog', () => ({
  Dialog: ({ open, title, children, onClose }) => open && (
    <div role="dialog"><h2>{title}</h2>{children}<button onClick={onClose}>close</button></div>
  )
}));

describe('免費試用宣傳插頁', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'user-1', plan: 'free' };
    mockSubscription.userPlan = { type: 'free' };
    mockLocation.search = '';
    mockClaim.mockResolvedValue({ show: true });
  });

  it('一般 Free 帳號看到 CTA，關閉後同次登入不重複請求', async () => {
    const { rerender } = render(<FreeTrialPromotion />);
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    await userEvent.click(screen.getByText('freeTrial.promotion.later'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    rerender(<FreeTrialPromotion />);
    expect(mockClaim).toHaveBeenCalledTimes(1);
  });

  it('CTA 導向訂閱頁', async () => {
    render(<FreeTrialPromotion />);
    await userEvent.click(await screen.findByText('freeTrial.promotion.cta'));
    expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/subscription-plans');
  });

  it('Pro 帳號不領取展示次數，也不顯示插頁', async () => {
    mockAuth.user = { id: 'pro-1', plan: 'pro' };
    mockSubscription.userPlan = { type: 'pro' };
    render(<FreeTrialPromotion />);
    await waitFor(() => expect(mockClaim).not.toHaveBeenCalled());
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('本機預覽可停留顯示，且不消耗展示次數', () => {
    mockAuth.user = null;
    mockSubscription.userPlan = null;
    mockLocation.search = '?previewFreeTrial=1';
    const originalEnvironment = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    try {
      render(<FreeTrialPromotion />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(mockClaim).not.toHaveBeenCalled();
    } finally {
      process.env.NODE_ENV = originalEnvironment;
    }
  });
});
