import React from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import FreeTrialPromotion from '../FreeTrialPromotion';

const mockNavigate = jest.fn();
const mockClaim = jest.fn();
const mockTrack = jest.fn();
const mockAuth = { user: { id: 'user-1', plan: 'free' } };
const mockSubscription = { userPlan: { type: 'free' } };
const mockLocation = { pathname: '/zh-TW/priceanalysis', search: '' };
const request = {
  id: 1, userId: 'user-1', pathname: '/zh-TW/priceanalysis',
  triggerSource: 'price_analysis_completed'
};

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
jest.mock('../../../../utils/productAnalytics', () => ({
  trackProductEvent: (...args) => mockTrack(...args)
}));
jest.mock('../../../Common/Dialog/Dialog', () => ({
  Dialog: ({ open, title, children, onClose }) => open && (
    <div role="dialog"><h2>{title}</h2>{children}<button onClick={onClose}>close</button></div>
  )
}));

const flush = async () => {
  await Promise.resolve();
  await Promise.resolve();
};

describe('免費試用宣傳插頁', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAuth.user = { id: 'user-1', plan: 'free' };
    mockSubscription.userPlan = { type: 'free' };
    mockLocation.pathname = '/zh-TW/priceanalysis';
    mockLocation.search = '';
    mockClaim.mockResolvedValue({ show: true });
  });

  afterEach(() => jest.useRealTimers());

  it('一般頁面初次載入不會自動 claim 或顯示插頁', () => {
    render(<FreeTrialPromotion />);
    expect(mockClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('完成分析後等待 3 秒，符合資格才顯示插頁', async () => {
    jest.useFakeTimers();
    render(<FreeTrialPromotion request={request} />);

    await act(async () => { jest.advanceTimersByTime(2999); });
    expect(mockClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flush();
    });

    expect(mockClaim).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(mockTrack).toHaveBeenCalledWith('free_trial_promotion_viewed', expect.objectContaining({
      trial_days: 30, placement: 'interstitial', trigger_source: 'price_analysis_completed'
    }));
  });

  it('其他 Dialog 開啟時不 claim；關閉後重新開始 3 秒計時', async () => {
    jest.useFakeTimers();
    const { rerender } = render(<FreeTrialPromotion request={request} otherDialogOpen />);

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(mockClaim).not.toHaveBeenCalled();

    rerender(<FreeTrialPromotion request={request} otherDialogOpen={false} />);
    await act(async () => { jest.advanceTimersByTime(2999); });
    expect(mockClaim).not.toHaveBeenCalled();

    await act(async () => {
      jest.advanceTimersByTime(1);
      await flush();
    });
    expect(mockClaim).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('AdSense 插頁開啟或冷卻期間不會觸發試用插頁', async () => {
    jest.useFakeTimers();
    const { rerender } = render(<FreeTrialPromotion request={request} adOpen />);

    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(mockClaim).not.toHaveBeenCalled();

    rerender(<FreeTrialPromotion request={request} adCooldownActive />);
    await act(async () => { jest.advanceTimersByTime(5000); });
    expect(mockClaim).not.toHaveBeenCalled();

    rerender(<FreeTrialPromotion request={request} />);
    await act(async () => {
      jest.advanceTimersByTime(3000);
      await flush();
    });
    expect(mockClaim).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('使用者離開分析頁後取消尚未執行的 claim', async () => {
    jest.useFakeTimers();
    const { rerender } = render(<FreeTrialPromotion request={request} />);

    mockLocation.pathname = '/zh-TW/market-sentiment';
    rerender(<FreeTrialPromotion request={request} />);
    await act(async () => { jest.advanceTimersByTime(5000); });

    expect(mockClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('互斥鎖暫時不可取得時不顯示，鎖釋放後可重試並於關閉時釋放', async () => {
    jest.useFakeTimers();
    const onAcquire = jest.fn().mockReturnValueOnce(false).mockReturnValue(true);
    const onRelease = jest.fn();
    const { rerender } = render(
      <FreeTrialPromotion request={request} onAcquire={onAcquire} onRelease={onRelease} />
    );

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await flush();
    });
    expect(onAcquire).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    rerender(<FreeTrialPromotion request={request} adOpen onAcquire={onAcquire} onRelease={onRelease} />);
    rerender(<FreeTrialPromotion request={request} onAcquire={onAcquire} onRelease={onRelease} />);
    expect(onAcquire).toHaveBeenCalledTimes(2);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.click(screen.getByText('freeTrial.promotion.later'));
    expect(onRelease).toHaveBeenCalledTimes(1);
  });

  it('CTA 導向試用流程並保留分析上下文', async () => {
    jest.useFakeTimers();
    mockLocation.search = `?returnTo=${encodeURIComponent('/zh-TW/priceanalysis?stockCode=AAPL&years=7')}`;
    render(<FreeTrialPromotion request={request} />);

    await act(async () => {
      jest.advanceTimersByTime(3000);
      await flush();
    });
    fireEvent.click(screen.getByText('freeTrial.promotion.cta'));
    expect(mockNavigate).toHaveBeenCalledWith(
      expect.stringMatching(/^\/zh-TW\/payment\/free-trial\?returnTo=/)
    );
  });

  it('Pro 帳號不 claim，也不顯示插頁', () => {
    mockAuth.user = { id: 'pro-1', plan: 'pro' };
    mockSubscription.userPlan = { type: 'pro' };
    render(<FreeTrialPromotion request={{ ...request, userId: 'pro-1' }} />);

    expect(mockClaim).not.toHaveBeenCalled();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('本機預覽可直接顯示，且不消耗展示次數', () => {
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
