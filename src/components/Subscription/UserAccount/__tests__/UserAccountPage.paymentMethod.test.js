/**
 * 紅線是「既有定期定額訂戶的帳戶頁完全不變」。證明方式是同一個 plan 分別在沒有與有
 * 付款方式元件的帳戶頁各 render 一次，直接比 HTML。
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../i18n';
import { UserAccountPage } from '../UserAccountPage';
import { fetchPaymentMethod } from '../../../../services/cardUpdateService';

let mockPlan = null;
let mockWithPaymentMethod = true;

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => () => {},
    useParams: () => ({ lang: 'zh-TW' })
}));

jest.mock('../../../Auth/useAuth', () => ({
    useAuth: () => ({ user: { id: 'u1', username: 'tony', email: 'tony@example.com' }, logout: () => {} })
}));

jest.mock('../../SubscriptionContext', () => ({
    useSubscription: () => ({ userPlan: mockPlan, loading: false, error: null })
}));

jest.mock('../components/PlanInfo', () => ({ PlanInfo: () => null }));

jest.mock('../../../Payment/PaymentHistory', () => ({ __esModule: true, default: () => null }));

jest.mock('../../../../utils/analytics', () => ({
    Analytics: { track: () => {}, error: () => {} }
}));

jest.mock('../../../../services/cardUpdateService', () => ({
    fetchPaymentMethod: jest.fn()
}));

jest.mock('../components/PaymentMethod', () => {
    const mockReact = require('react');
    const actual = jest.requireActual('../components/PaymentMethod');
    return {
        PaymentMethod: (props) => (mockWithPaymentMethod ? mockReact.createElement(actual.PaymentMethod, props) : null)
    };
});

const PRO_PLAN = { type: 'pro', status: 'active', autoRenew: true, isActive: true, isExpired: false };

const renderPageHtml = async ({ withPaymentMethod }) => {
    mockWithPaymentMethod = withPaymentMethod;
    const { container, unmount } = render(
        <I18nextProvider i18n={i18n}>
            <UserAccountPage />
        </I18nextProvider>
    );
    await act(async () => {});
    const html = container.innerHTML;
    unmount();
    return html;
};

describe('帳戶頁加上付款方式區塊之後', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        fetchPaymentMethod.mockResolvedValue({
            cardLast4: '4242',
            cardValidYY: '28',
            cardValidMM: '07',
            billingPeriod: 'monthly',
            inGrace: false,
            graceUntil: null,
            amountDue: 199,
            nextChargeAt: '2026-10-13T16:00:00Z'
        });
    });

    it.each([
        ['定期定額訂戶', { ...PRO_PLAN, billingRail: 'ecpay_period' }],
        ['沒有 billingRail 的舊資料', PRO_PLAN]
    ])('%s的帳戶頁 HTML 與沒有這個元件時一模一樣，也不打 API', async (label, plan) => {
        mockPlan = plan;

        const without = await renderPageHtml({ withPaymentMethod: false });
        const withComponent = await renderPageHtml({ withPaymentMethod: true });

        expect(withComponent).toBe(without);
        expect(fetchPaymentMethod).not.toHaveBeenCalled();
    });

    it('綁卡訂戶的帳戶頁確實多出 #payment-method，上面的比對不是空轉', async () => {
        mockPlan = { ...PRO_PLAN, billingRail: 'bound_card' };

        const without = await renderPageHtml({ withPaymentMethod: false });
        const withComponent = await renderPageHtml({ withPaymentMethod: true });

        expect(without).not.toContain('id="payment-method"');
        expect(withComponent).toContain('id="payment-method"');
    });
});
