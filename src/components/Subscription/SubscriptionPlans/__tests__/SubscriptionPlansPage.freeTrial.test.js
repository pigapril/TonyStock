/**
 * 方案頁上的免綁卡試用入口。
 *
 * 紅線是「既有付費者與不合資格的人看到的東西完全不變」。有資格的人只看得到試用入口，
 * 套用了優惠碼的人例外：他們走原本的付款頁使用折扣。
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

jest.mock('../../../../services/freeTrialService', () => ({
    fetchFreeTrialEligibility: (...args) => mockFetchEligibility(...args)
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

describe('方案頁的免綁卡試用入口', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockAuthState.user = { id: 'user-1', email: 'pigapril@gmail.com' };
        mockSubscriptionState.userPlan = null;
        mockSubscriptionState.subscriptionHistory = [];
        mockSubscriptionState.loading = false;
        mockFetchEligibility.mockResolvedValue({ eligible: true, reason: null });
    });

    it('一般已登入帳號也能看到試用入口', async () => {
        mockAuthState.user = { id: 'user-2', email: 'b@example.com' };
        renderPage();
        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
        expect(mockFetchEligibility).toHaveBeenCalledTimes(1);
    });

    it('第二個指定帳號可見試用，Email 大小寫不影響比對', async () => {
        mockAuthState.user = { id: 'user-2', email: 'HUANG41487@gmail.com' };
        renderPage();
        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
    });

    it('有資格時只看得到試用按鈕，看不到既有 Pro 按鈕', async () => {
        renderPage();

        expect(await screen.findByRole('button', { name: TRIAL_CTA })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: EXISTING_PRO_CTA })).not.toBeInTheDocument();
    });

    it('試用按鈕導向免綁卡試用頁', async () => {
        renderPage();

        await userEvent.click(await screen.findByRole('button', { name: TRIAL_CTA }));

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/free-trial');
    });

    it('切到年繳後仍導向同一個試用頁', async () => {
        renderPage();

        const trial = await screen.findByRole('button', { name: TRIAL_CTA });
        await userEvent.click(screen.getByRole('button', { name: /年繳/ }));
        await userEvent.click(trial);

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/free-trial');
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

    // 試用資格 API 失敗時仍可透過既有入口訂閱。
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

    it('Pro 試用期間顯示到期日，無法從方案頁提前付款', async () => {
        mockSubscriptionState.userPlan = {
            type: 'pro', status: 'active', autoRenew: false,
            isActive: true, isExpired: false,
            trialEnd: new Date('2030-11-07T17:00:00.000Z')
        };
        renderPage();

        const button = await screen.findByRole('button', { name: 'Pro 試用中' });
        expect(button).toBeDisabled();
        expect(screen.getByText('試用至 2030/11/8，結束後可選擇訂閱')).toBeInTheDocument();
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: 'mock-apply-redemption' }));
        expect(screen.getByRole('button', { name: 'Pro 試用中' })).toBeDisabled();
        expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('試用結束後恢復付費訂閱入口', async () => {
        mockFetchEligibility.mockResolvedValue({ eligible: false, reason: 'previous_subscriber' });
        mockSubscriptionState.userPlan = {
            type: 'pro', status: 'active', autoRenew: false,
            isActive: false, isExpired: true,
            trialEnd: new Date('2020-11-08T00:00:00.000Z')
        };
        renderPage();

        const button = await screen.findByRole('button', { name: EXISTING_PRO_CTA });
        expect(button).toBeEnabled();
        await userEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment?plan=pro&period=monthly');
    });

    it('未登入時根本不去問資格', async () => {
        mockAuthState.user = null;
        renderPage();

        await screen.findByText('Pro');
        expect(mockFetchEligibility).not.toHaveBeenCalled();
        expect(screen.queryByText(TRIAL_CTA)).not.toBeInTheDocument();
    });
});
