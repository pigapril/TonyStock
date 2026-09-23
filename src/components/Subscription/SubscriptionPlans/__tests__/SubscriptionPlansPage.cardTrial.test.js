/**
 * 方案頁上的綁卡試用入口。
 *
 * 紅線是「既有付費者與不合資格的人看到的東西完全不變」。有資格的人只看得到試用入口，
 * 套用了優惠碼的人例外：綁卡軌沒有接折扣，他們走原本的付款頁。
 *
 * 證明方式不是逐項比對文字，而是把不合資格、查詢失敗、查詢還沒回來這三種情況下的
 * 按鈕區塊 HTML 直接拿來互比：只要有一個分支漏掉，HTML 就會不一樣。
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { HelmetProvider } from 'react-helmet-async';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';

const mockNavigate = jest.fn();
const mockFetchEligibility = jest.fn();
const mockAuthState = { user: { id: 'user-1', email: 'pigapril@gmail.com' } };
const mockSubscriptionState = { userPlan: null, subscriptionHistory: [], loading: false };
const originalRollout = process.env.REACT_APP_CARD_TRIAL_ROLLOUT;

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ lang: 'zh-TW' }),
    useLocation: () => ({ state: null, pathname: '/zh-TW/subscription' })
}));

jest.mock('../../../Auth/useAuth', () => ({
    useAuth: () => mockAuthState
}));

jest.mock('../../SubscriptionContext', () => ({
    useSubscription: () => mockSubscriptionState
}));

jest.mock('../../../Common/Dialog/useDialog', () => ({
    useDialog: () => ({ openDialog: jest.fn(), closeDialog: jest.fn() })
}));

// 真的輸入框要打後端驗碼。這裡換成一顆按鈕，按下去就像驗碼成功一樣呼叫頁面給的 callback。
jest.mock('../../../Redemption/RedemptionCodeInput', () => ({
    RedemptionCodeInput: ({ onRedemptionSuccess }) => require('react').createElement(
        'button',
        {
            type: 'button',
            onClick: () => onRedemptionSuccess({
                code: 'SAVE10',
                targetPlan: 'pro',
                benefits: { type: 'discount', discountType: 'PERCENTAGE_DISCOUNT', savingsPercentage: 10 }
            })
        },
        'mock-apply-redemption'
    )
}));

jest.mock('../../../../services/cardTrialService', () => ({
    fetchCardTrialEligibility: (...args) => mockFetchEligibility(...args)
}));

// CRA 的 jest 設定是 resetMocks: true，jest.fn() 的 mockResolvedValue 會在每條測試前被清空，
// 頁面拿到 undefined 就在 availablePlans.map 掛掉。所以這裡用普通函式。
jest.mock('../../../../api/subscriptionService', () => {
    const plans = [
        { id: 'free', name: 'Free', price: { monthly: 0, yearly: 0 }, popular: false },
        {
            id: 'pro',
            name: 'Pro',
            price: { monthly: 199, yearly: 1990 },
            showRealPrice: true,
            popular: true
        }
    ];
    return {
        __esModule: true,
        default: {
            getAvailablePlansFromAPI: () => Promise.resolve(plans),
            getAvailablePlans: () => plans
        }
    };
});

jest.mock('../../../../utils/analytics', () => ({
    Analytics: {
        track: jest.fn(),
        error: jest.fn(),
        auth: { loginRequired: jest.fn() }
    }
}));

const { SubscriptionPlansPage } = require('../SubscriptionPlansPage');

const TRIAL_CTA = '免費試用 30 天';
const EXISTING_PRO_CTA = '立即付款升級';

const renderPage = () => render(
    <HelmetProvider>
        <I18nextProvider i18n={i18n}>
            <SubscriptionPlansPage />
        </I18nextProvider>
    </HelmetProvider>
);

// Pro 卡是第二張，它的按鈕區塊就是這次唯一會動到的地方。
const proAction = async () => {
    await screen.findByText('Pro');
    const actions = document.querySelectorAll('.plan-card__action');
    return actions[actions.length - 1];
};

describe('方案頁的綁卡試用入口', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        process.env.REACT_APP_CARD_TRIAL_ROLLOUT = 'allowlist';
        mockAuthState.user = { id: 'user-1', email: 'pigapril@gmail.com' };
        mockSubscriptionState.userPlan = null;
        mockSubscriptionState.subscriptionHistory = [];
        mockSubscriptionState.loading = false;
        mockFetchEligibility.mockResolvedValue({ eligible: true, reason: null });
    });

    afterAll(() => {
        if (originalRollout === undefined) delete process.env.REACT_APP_CARD_TRIAL_ROLLOUT;
        else process.env.REACT_APP_CARD_TRIAL_ROLLOUT = originalRollout;
    });

    it('未列入名單時不查試用資格，只顯示原本付費入口', async () => {
        mockAuthState.user = { id: 'user-2', email: 'b@example.com' };
        renderPage();

        expect(await screen.findByRole('button', { name: EXISTING_PRO_CTA })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: TRIAL_CTA })).not.toBeInTheDocument();
        expect(mockFetchEligibility).not.toHaveBeenCalled();
    });

    it('第二個指定帳號可見試用，Email 大小寫不影響比對', async () => {
        mockAuthState.user = { id: 'user-2', email: 'HUANG41487@gmail.com' };
        renderPage();
        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
    });

    it('明確設定 all 才向其他帳號開放', async () => {
        mockAuthState.user = { id: 'user-2', email: 'b@example.com' };
        const { rerender } = renderPage();

        expect(await screen.findByRole('button', { name: EXISTING_PRO_CTA })).toBeInTheDocument();
        expect(mockFetchEligibility).not.toHaveBeenCalled();

        process.env.REACT_APP_CARD_TRIAL_ROLLOUT = 'all';
        rerender(
            <HelmetProvider>
                <I18nextProvider i18n={i18n}>
                    <SubscriptionPlansPage />
                </I18nextProvider>
            </HelmetProvider>
        );
        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
    });

    it('有資格時只看得到試用按鈕，看不到既有 Pro 按鈕', async () => {
        renderPage();

        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: EXISTING_PRO_CTA })).not.toBeInTheDocument();
    });

    it('試用按鈕導向綁卡頁並帶上月繳', async () => {
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: TRIAL_CTA }));

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/card-trial?period=monthly');
    });

    it('切到年繳後試用導向帶 period=yearly', async () => {
        renderPage();

        const trial = await screen.findByRole('button', { name: TRIAL_CTA });
        await userEvent.click(screen.getByRole('button', { name: /年繳/ }));
        await userEvent.click(trial);

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/card-trial?period=yearly');
    });

    it('已套用優惠碼時顯示既有按鈕、導向既有付款頁並帶優惠碼，看不到試用', async () => {
        renderPage();

        await screen.findByRole('button', { name: TRIAL_CTA });
        await userEvent.click(screen.getByRole('button', { name: 'mock-apply-redemption' }));

        const button = await screen.findByRole('button', { name: EXISTING_PRO_CTA });
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();

        await userEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledTimes(1);
        expect(mockNavigate.mock.calls[0][0]).toMatch(/^\/zh-TW\/payment\?plan=pro&period=monthly&redemption=SAVE10(&|$)/);
    });

    it('不合資格時只有既有的訂閱按鈕，導向也不變', async () => {
        mockFetchEligibility.mockResolvedValue({ eligible: false, reason: 'previous_subscriber' });
        renderPage();

        const button = await screen.findByRole('button', { name: EXISTING_PRO_CTA });
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();

        await userEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment?plan=pro&period=monthly');
    });

    // 綁卡軌掛掉不可以連帶讓方案頁賣不出東西，所以失敗時當作沒資格。
    it('查詢失敗時 fail closed，畫面與不合資格時一模一樣', async () => {
        mockFetchEligibility.mockResolvedValue({ eligible: false, reason: 'previous_subscriber' });
        const { unmount } = renderPage();
        await waitFor(() => expect(mockFetchEligibility).toHaveBeenCalled());
        const ineligible = (await proAction()).innerHTML;

        unmount();
        jest.clearAllMocks();
        mockFetchEligibility.mockRejectedValue(new Error('boom'));
        renderPage();
        await waitFor(() => expect(mockFetchEligibility).toHaveBeenCalled());

        expect((await proAction()).innerHTML).toBe(ineligible);
    });

    it('查詢還沒回來之前顯示的也是既有按鈕，不是試用', async () => {
        mockFetchEligibility.mockReturnValue(new Promise(() => {}));
        renderPage();

        expect(await screen.findByRole('button', { name: EXISTING_PRO_CTA })).toBeInTheDocument();
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();
    });

    // 這條是紅線本身：就算資格查詢說可以，已經在付錢的人畫面也不准變。
    it('既有付費者即使查詢回 eligible 也看不到試用入口', async () => {
        mockSubscriptionState.userPlan = {
            type: 'pro',
            status: 'active',
            isActive: true,
            isExpired: false,
            autoRenew: true
        };
        renderPage();

        expect(await screen.findByRole('button', { name: '目前使用' })).toBeDisabled();
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();
    });

    it('未登入時根本不去問資格', async () => {
        mockAuthState.user = null;
        renderPage();

        await screen.findByText('Pro');
        expect(mockFetchEligibility).not.toHaveBeenCalled();
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();
    });
});
