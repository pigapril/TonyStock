/**
 * 綁卡試用入口對方案卡片的影響。
 *
 * 紅線是「既有付費用戶與不合資格的人看到的東西不可以有任何改變」。有資格的人只看得到
 * 試用入口；套用了優惠碼的人例外，綁卡軌沒有接折扣，他們要走原本的付款頁。
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { PlanCard } from '../PlanCard';

const mockNavigate = jest.fn();

jest.mock('react-i18next', () => ({
    // 元件有 returnObjects: true 的用法，回字串會讓 .map 掛掉。
    useTranslation: () => ({
        t: (key, options) => (options && options.returnObjects ? [] : key)
    })
}));

jest.mock('react-router-dom', () => ({
    useNavigate: () => mockNavigate,
    useParams: () => ({ lang: 'zh-TW' })
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
    pricing: { monthly: 199, yearly: 1990 },
    features: []
};

const renderCard = (props = {}) => render(
    <PlanCard plan={PRO_PLAN} currentPlan="free" isCurrentUser billingPeriod="monthly" {...props} />
);

const trialButton = () => screen.queryByText('cardTrial.planCard.startTrial');
const existingButton = () => screen.queryByText('payment.form.upgradeNow');

describe('PlanCard 的綁卡試用入口', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockSubscription = { userPlan: null, subscriptionHistory: [], loading: false };
    });

    it('沒傳 cardTrialEligible 時完全看不到試用入口', () => {
        renderCard();

        expect(trialButton()).toBeNull();
    });

    it('明確不合資格時也看不到', () => {
        renderCard({ cardTrialEligible: false });

        expect(trialButton()).toBeNull();
    });

    it('合資格時才出現試用按鈕', () => {
        renderCard({ cardTrialEligible: true });

        expect(trialButton()).not.toBeNull();
        expect(existingButton()).toBeNull();
    });

    it('合資格但已套用優惠碼時看不到試用入口，按鈕是既有的訂閱按鈕', () => {
        renderCard({ cardTrialEligible: true, appliedRedemption: { code: 'SAVE10' } });

        expect(trialButton()).toBeNull();
        expect(existingButton()).not.toBeNull();
    });

    it('試用導向帶上計費週期', () => {
        renderCard({ cardTrialEligible: true, billingPeriod: 'yearly' });

        fireEvent.click(trialButton());

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/card-trial?period=yearly');
    });

    it('既有付費用戶不顯示試用入口,就算資格查詢回 true', () => {
        mockSubscription = {
            userPlan: { type: 'pro', autoRenew: true, cancelAtPeriodEnd: false, isCancelled: false },
            subscriptionHistory: [],
            loading: false
        };

        renderCard({ cardTrialEligible: true, currentPlan: 'pro' });

        expect(trialButton()).toBeNull();
    });

    it('取消但仍有效的訂閱者在資格是 false 時一樣看不到入口', () => {
        mockSubscription = {
            userPlan: { type: 'pro', autoRenew: true, cancelAtPeriodEnd: true, isCancelled: false },
            subscriptionHistory: [],
            loading: false
        };

        renderCard({ cardTrialEligible: false, currentPlan: 'pro' });

        // 資格是 false，所以仍然不顯示。這條確認入口的開關是資格而不是訂閱狀態。
        expect(trialButton()).toBeNull();
    });
});
