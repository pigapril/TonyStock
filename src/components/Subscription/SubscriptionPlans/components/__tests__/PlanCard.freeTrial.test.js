/**
 * 免綁卡試用入口對方案卡片的影響。
 *
 * 紅線是「既有付費用戶與不合資格的人看到的東西不可以有任何改變」。有資格的人只看得到
 * 試用入口；套用了優惠碼的人走原本的付款頁使用折扣。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanCard } from '../PlanCard';

const mockNavigate = jest.fn();
let mockLocation = { search: '' };
let mockLanguage = 'zh-TW';

jest.mock('react-i18next', () => ({
    // 元件有 returnObjects: true 的用法，回字串會讓 .map 掛掉。
    useTranslation: () => ({
        i18n: { language: mockLanguage },
        t: (key, options) => {
            if (key === 'subscription.billingPeriod.perMonth') return mockLanguage === 'en' ? '/month' : '/月';
            if (key === 'subscription.billingPeriod.perYear') return mockLanguage === 'en' ? '/year' : '/年';
            return options && options.returnObjects ? [] : key;
        }
    })
}));

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ lang: mockLanguage }),
    useLocation: () => mockLocation
}));

let mockSubscription = { userPlan: null, subscriptionHistory: [], loading: false };

jest.mock('../../../SubscriptionContext', () => ({
    useSubscription: () => mockSubscription
}));

jest.mock('../../../../Common/Dialog/useDialog', () => ({
    useDialog: () => ({ openDialog: jest.fn() })
}));

jest.mock('../../../../Auth/useAuth', () => ({
    useAuth: () => ({ user: { email: 'a@b.c' } })
}));

jest.mock('../../../../../utils/analytics', () => ({
    Analytics: { track: jest.fn() }
}));

jest.mock('../../../../../utils/premiumWhitelist', () => ({
    canAccessPaymentFeatures: () => true
}));

const PRO_PLAN = {
    id: 'pro',
    name: 'Pro',
    price: { monthly: 199, yearly: 1990 },
    features: []
};

const renderCard = (props = {}) => render(
    <PlanCard plan={PRO_PLAN} currentPlan="free" isCurrentUser billingPeriod="monthly" {...props} />
);

const trialButton = () => screen.queryByText('freeTrial.planCard.startTrial');
const existingButton = () => screen.queryByText('payment.form.upgradeNow');

describe('PlanCard 的免綁卡試用入口', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocation = { search: '' };
        mockLanguage = 'zh-TW';
        mockSubscription = { userPlan: null, subscriptionHistory: [], loading: false };
    });

    it('沒傳 freeTrialEligible 時完全看不到試用入口', () => {
        renderCard();

        expect(trialButton()).toBeNull();
    });

    it('明確不合資格時也看不到', () => {
        renderCard({ freeTrialEligible: false });

        expect(trialButton()).toBeNull();
    });

    it('合資格時才出現試用按鈕', () => {
        renderCard({ freeTrialEligible: true });

        expect(trialButton()).not.toBeNull();
        expect(existingButton()).toBeNull();
    });

    it('訪客的 Pro 主按鈕改為試用入口並交由方案頁開啟登入流程', () => {
        const onTrialLoginRequired = jest.fn();
        renderCard({ isCurrentUser: false, onTrialLoginRequired });

        fireEvent.click(screen.getByText('freeTrial.ctaShort'));

        expect(onTrialLoginRequired).toHaveBeenCalledTimes(1);
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('合資格但已套用優惠碼時看不到試用入口，按鈕是既有的訂閱按鈕', () => {
        renderCard({ freeTrialEligible: true, appliedRedemption: { code: 'SAVE10' } });

        expect(trialButton()).toBeNull();
        expect(existingButton()).not.toBeNull();
    });

    it('試用導向免綁卡頁，與當前計費週期無關', () => {
        renderCard({ freeTrialEligible: true, billingPeriod: 'yearly' });

        fireEvent.click(trialButton());

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/free-trial');
    });

    it('既有付費用戶不顯示試用入口,就算資格查詢回 true', () => {
        mockSubscription = {
            userPlan: { type: 'pro', autoRenew: true, cancelAtPeriodEnd: false, isCancelled: false },
            subscriptionHistory: [],
            loading: false
        };

        renderCard({ freeTrialEligible: true, currentPlan: 'pro' });

        expect(trialButton()).toBeNull();
    });

    it('原股票查詢會從方案頁帶到試用頁', () => {
        const query = `?${new URLSearchParams({ returnTo: '/en/priceanalysis?stockCode=AAPL&years=7' })}`;
        mockLanguage = 'en';
        mockLocation.search = query;
        renderCard({ freeTrialEligible: true });
        fireEvent.click(trialButton());
        expect(mockNavigate).toHaveBeenCalledWith(`/en/payment/free-trial${query}`);
    });

    it.each([['monthly', 'NT$199', '/month'], ['yearly', 'NT$1,990', '/year']])('英文 %s 明確顯示新台幣與英文週期', (billingPeriod, amount, period) => {
        mockLanguage = 'en';
        renderCard({ billingPeriod });
        expect(screen.getByText(amount)).toBeInTheDocument();
        expect(screen.getByText(period, { selector: '.plan-card__price-period' })).toBeInTheDocument();
        expect(screen.getByText('subscription.billingPeriod.currencyNote')).toBeInTheDocument();
    });

    it('試用未到期仍禁止訂閱，保留剩餘試用天數', () => {
        mockSubscription.userPlan = {
            type: 'pro', isActive: true, autoRenew: false,
            trialEnd: new Date(Date.now() + 86400000).toISOString()
        };
        renderCard({ currentPlan: 'pro', freeTrialEligible: true });
        const button = screen.getByRole('button', { name: 'freeTrial.planCard.trialActive' });
        expect(button).toBeDisabled();
        fireEvent.click(button);
        expect(mockNavigate).not.toHaveBeenCalled();
        expect(trialButton()).toBeNull();
    });

    it('取消但仍有效的訂閱者在資格是 false 時一樣看不到入口', () => {
        mockSubscription = {
            userPlan: { type: 'pro', autoRenew: true, cancelAtPeriodEnd: true, isCancelled: false },
            subscriptionHistory: [],
            loading: false
        };

        renderCard({ freeTrialEligible: false, currentPlan: 'pro' });

        // 資格是 false，所以仍然不顯示。這條確認入口的開關是資格而不是訂閱狀態。
        expect(trialButton()).toBeNull();
    });
});
