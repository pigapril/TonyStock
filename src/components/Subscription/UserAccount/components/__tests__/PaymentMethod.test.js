import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../../../i18n';
import { PaymentMethod } from '../PaymentMethod';
import { fetchPaymentMethod } from '../../../../../services/cardUpdateService';

const mockNavigate = jest.fn();
let mockLang = 'zh-TW';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useParams: () => ({ lang: mockLang })
}));

jest.mock('../../../../../services/cardUpdateService', () => ({
    fetchPaymentMethod: jest.fn()
}));

const PRO_PLAN = { type: 'pro', status: 'active', autoRenew: true, isActive: true, isExpired: false };
const BOUND_CARD_PLAN = { ...PRO_PLAN, billingRail: 'bound_card' };

// 台北已經是 10/2，UTC 還停在 10/1。
const GRACE_UNTIL = '2026-10-01T16:30:00Z';

const method = (overrides = {}) => ({
    cardLast4: '4242',
    cardValidYY: '28',
    cardValidMM: '07',
    billingPeriod: 'monthly',
    inGrace: false,
    graceUntil: null,
    amountDue: 199,
    nextChargeAt: '2026-10-13T16:00:00Z',
    ...overrides
});

const renderBlock = (plan) => render(
    <I18nextProvider i18n={i18n}>
        <PaymentMethod plan={plan} />
    </I18nextProvider>
);

const settle = () => act(async () => {});

describe('帳戶頁的付款方式區塊', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        jest.spyOn(Element.prototype, 'scrollIntoView').mockImplementation(() => {});
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it.each([
        ['定期定額訂戶', { ...PRO_PLAN, billingRail: 'ecpay_period' }],
        ['沒有 billingRail 的舊資料', PRO_PLAN],
        ['方案還沒載入', null]
    ])('%s不打 API、不輸出任何 DOM', async (label, plan) => {
        const { container } = renderBlock(plan);
        await settle();

        expect(fetchPaymentMethod).not.toHaveBeenCalled();
        expect(container.innerHTML).toBe('');
    });

    it.each([
        ['API 回 null', () => fetchPaymentMethod.mockResolvedValue(null)],
        ['API 丟錯', () => fetchPaymentMethod.mockRejectedValue(new Error('boom'))]
    ])('綁卡訂戶但%s時不 render', async (label, arrange) => {
        arrange();
        const { container } = renderBlock(BOUND_CARD_PLAN);

        await waitFor(() => expect(fetchPaymentMethod).toHaveBeenCalledTimes(1));
        await settle();

        expect(container.innerHTML).toBe('');
    });

    it('有末四碼時顯示末四碼與有效期限，外層是 #payment-method', async () => {
        fetchPaymentMethod.mockResolvedValue(method());
        const { container } = renderBlock(BOUND_CARD_PLAN);

        expect(await screen.findByText('•••• 4242，有效期限 07/28')).toBeInTheDocument();
        expect(container.firstChild.id).toBe('payment-method');
    });

    it('沒有末四碼時只顯示有效期限', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ cardLast4: null }));
        renderBlock(BOUND_CARD_PLAN);

        expect(await screen.findByText('有效期限 07/28')).toBeInTheDocument();
        expect(screen.queryByText(/••••/)).not.toBeInTheDocument();
    });

    // 回呼沒帶 CardInfo 時有效年月存成 null。
    it('有末四碼但沒有有效年月時只顯示末四碼', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ cardValidMM: null, cardValidYY: null }));
        const { container } = renderBlock(BOUND_CARD_PLAN);

        await screen.findByRole('button', { name: '更換卡片' });
        expect(container.querySelector('.payment-method__card')).toHaveTextContent(/^•••• 4242$/);
        expect(container).not.toHaveTextContent('null');
    });

    it('末四碼與有效年月都沒有時不顯示卡片那一行，按鈕照常', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ cardLast4: null, cardValidMM: null, cardValidYY: null }));
        const { container } = renderBlock(BOUND_CARD_PLAN);

        const button = await screen.findByRole('button', { name: '更換卡片' });
        expect(container.querySelector('.payment-method__card')).toBeNull();
        expect(container).not.toHaveTextContent('null');

        await userEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/card-update');
    });

    it('平常是「更換卡片」，沒有寬限期提示，按下去到換卡頁', async () => {
        fetchPaymentMethod.mockResolvedValue(method());
        renderBlock(BOUND_CARD_PLAN);

        const button = await screen.findByRole('button', { name: '更換卡片' });
        expect(screen.queryByText(/這次扣款未成功/)).not.toBeInTheDocument();

        await userEvent.click(button);
        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/payment/card-update');
    });

    it('寬限期在上方提示期限（台北日期），按鈕帶金額', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ inGrace: true, graceUntil: GRACE_UNTIL }));
        renderBlock(BOUND_CARD_PLAN);

        const notice = await screen.findByText(/^這次扣款未成功/);
        expect(notice).toHaveTextContent(/^這次扣款未成功，我們沒有向你收取任何費用。請於 2026年10月2日 前更換付款卡片。$/);
        expect(notice).not.toHaveTextContent('2026年10月1日');
        expect(screen.getByRole('button', { name: '更換卡片並付款 199 元' })).toBeInTheDocument();
    });

    // 金額由 API 的 amountDue 決定。帳戶頁的 plan 故意不帶 billingPeriod，前端沒有依據可以自己判斷。
    it.each([
        ['monthly', 199, '更換卡片並付款 199 元'],
        ['yearly', 1990, '更換卡片並付款 1990 元']
    ])('%s 的寬限期按鈕顯示 API 給的 %s', async (billingPeriod, amountDue, label) => {
        fetchPaymentMethod.mockResolvedValue(method({ inGrace: true, graceUntil: GRACE_UNTIL, billingPeriod, amountDue }));
        renderBlock(BOUND_CARD_PLAN);

        expect(await screen.findByRole('button', { name: label })).toBeInTheDocument();
    });

    it('en 的金額是 NT$ 加千分位', async () => {
        mockLang = 'en';
        await i18n.changeLanguage('en');
        try {
            fetchPaymentMethod.mockResolvedValue(method({ inGrace: true, graceUntil: GRACE_UNTIL, amountDue: 1990 }));
            renderBlock(BOUND_CARD_PLAN);

            expect(await screen.findByRole('button', { name: 'Update card and pay NT$1,990' })).toBeInTheDocument();
        } finally {
            mockLang = 'zh-TW';
            await i18n.changeLanguage('zh-TW');
        }
    });

    // 上一筆扣款還在向綠界確認時換卡不會被扣款，確認失敗後又會要求換卡，所以先不給按鈕。
    it('扣款還在確認中：只顯示確認中，不給換卡按鈕，也不顯示寬限期提示', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ inGrace: true, graceUntil: GRACE_UNTIL, chargePending: true }));
        renderBlock(BOUND_CARD_PLAN);

        expect(await screen.findByText('上一筆扣款正在向銀行確認，確認完成前無法更換卡片。')).toBeInTheDocument();
        expect(screen.queryByRole('button')).not.toBeInTheDocument();
        expect(screen.queryByText(/這次扣款未成功/)).not.toBeInTheDocument();
    });

});
