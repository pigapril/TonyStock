import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import CardUpdateFlow from '../CardUpdateFlow';
import {
    createCardUpdateBind,
    fetchPaymentMethod,
    startCardUpdate
} from '../../../../services/cardUpdateService';
import {
    goToThreeDVerification,
    renderBindCardForm,
    requestBindCardPayToken
} from '../../../../utils/ecpayBindCardSdk';
import i18n from '../../../../i18n';

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ lang: 'zh-TW' })
}));

jest.mock('../../../../services/cardUpdateService', () => ({
    fetchPaymentMethod: jest.fn(),
    startCardUpdate: jest.fn(),
    createCardUpdateBind: jest.fn()
}));

jest.mock('../../../../utils/ecpayBindCardSdk', () => ({
    BIND_CARD_CONTAINER_ID: 'ECPayPayment',
    renderBindCardForm: jest.fn(),
    requestBindCardPayToken: jest.fn(),
    goToThreeDVerification: jest.fn()
}));

jest.mock('../../../../utils/logger', () => ({
    systemLogger: { info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }
}));

// 台北已經是 10/2，UTC 還停在 10/1。
const NEXT_CHARGE_AT = '2026-10-01T16:30:00Z';

const method = (overrides = {}) => ({
    cardLast4: '4242',
    cardValidYY: '28',
    cardValidMM: '07',
    billingPeriod: 'monthly',
    inGrace: false,
    graceUntil: null,
    amountDue: 199,
    nextChargeAt: NEXT_CHARGE_AT,
    ...overrides
});

const GRACE_MONTHLY = method({ inGrace: true, graceUntil: '2026-09-20T16:00:00Z' });
const GRACE_YEARLY = method({ inGrace: true, graceUntil: '2026-09-20T16:00:00Z', billingPeriod: 'yearly', amountDue: 1990 });

const renderFlow = () => render(
    <I18nextProvider i18n={i18n}>
        <CardUpdateFlow />
    </I18nextProvider>
);

const VERIFICATION = '綁定新卡時會進行一筆 2 元的驗證，你不會被收取這筆費用';
const FUTURE_CHARGES = '之後的扣款會改用新卡';
const GENERIC_ERROR = '目前無法綁定信用卡，請稍後再試。';

const consentAndStart = async (buttonName) => {
    await userEvent.click(await screen.findByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: buttonName }));
};

const submitCard = async () => {
    const submit = await screen.findByRole('button', { name: '綁定新卡' });
    await waitFor(() => expect(submit).toBeEnabled());
    await userEvent.click(submit);
};

const STATE_CHANGED = { response: { status: 409, data: { status: 'error', data: { errorCode: 'CARD_UPDATE_STATE_CHANGED' } } } };
const STATE_CHANGED_MESSAGE = '付款狀態剛剛有變動，請重新整理頁面後再試一次。';
const CHARGE_PENDING = { response: { status: 409, data: { status: 'error', data: { errorCode: 'CARD_UPDATE_CHARGE_PENDING' } } } };
const CHARGE_PENDING_MESSAGE = '上一筆扣款正在向銀行確認，確認完成前無法更換卡片。';

describe('CardUpdateFlow', () => {
    const realLocation = window.location;

    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    afterEach(() => {
        window.location = realLocation;
    });

    beforeEach(() => {
        jest.clearAllMocks();
        delete window.location;
        window.location = { assign: jest.fn(), reload: jest.fn() };
        fetchPaymentMethod.mockResolvedValue(method());
        startCardUpdate.mockResolvedValue({ merchantTradeNo: 'CU-1', token: 'ecpg-token' });
        renderBindCardForm.mockResolvedValue();
        requestBindCardPayToken.mockResolvedValue('pay-token');
        createCardUpdateBind.mockResolvedValue({ threeDUrl: 'https://ecpg.ecpay.com.tw/3d/abc' });
    });

    it('平常只有兩句說明，按鈕不帶金額', async () => {
        renderFlow();

        expect(await screen.findByText(VERIFICATION)).toBeInTheDocument();
        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('更換付款卡片');
        expect(screen.getByText(FUTURE_CHARGES)).toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(2);
        expect(screen.getByRole('button', { name: '同意並綁定新卡' })).toBeInTheDocument();
    });

    it('寬限期有四句說明，下次扣款日是台北日期', async () => {
        fetchPaymentMethod.mockResolvedValue(GRACE_MONTHLY);
        renderFlow();

        expect(await screen.findByText(VERIFICATION)).toBeInTheDocument();
        expect(screen.getByText(FUTURE_CHARGES)).toBeInTheDocument();
        expect(screen.getByText('換卡成功後會立即扣款 199 元')).toBeInTheDocument();
        expect(screen.getByText('扣款成功後，下次扣款日為 2026年10月2日')).toBeInTheDocument();
        expect(screen.queryByText(/2026年10月1日/)).not.toBeInTheDocument();
        expect(screen.getAllByRole('listitem')).toHaveLength(4);
        expect(screen.getByRole('button', { name: '同意並綁定新卡，付款 199 元' })).toBeInTheDocument();
    });

    it('年繳寬限期的金額是 API 給的 1990', async () => {
        fetchPaymentMethod.mockResolvedValue(GRACE_YEARLY);
        renderFlow();

        expect(await screen.findByText('換卡成功後會立即扣款 1990 元')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '同意並綁定新卡，付款 1990 元' })).toBeInTheDocument();
        expect(screen.queryByText(/199 元/)).not.toBeInTheDocument();
    });

    it('沒勾同意就不能送出', async () => {
        renderFlow();

        const start = await screen.findByRole('button', { name: '同意並綁定新卡' });
        expect(start).toBeDisabled();
        await userEvent.click(start);

        expect(startCardUpdate).not.toHaveBeenCalled();
    });

    it('送出帶 card-update-v1、同意時間、語系與寬限期揭露，不帶繳期', async () => {
        renderFlow();

        const before = Date.now();
        await consentAndStart('同意並綁定新卡');

        await waitFor(() => expect(startCardUpdate).toHaveBeenCalledTimes(1));
        const [payload] = startCardUpdate.mock.calls[0];
        expect(Object.keys(payload).sort()).toEqual(['disclosedGrace', 'locale', 'termsConsentedAt', 'termsVersion']);
        expect(payload.disclosedGrace).toBe(false);
        expect(payload.termsVersion).toBe('card-update-v1');
        expect(payload.locale).toBe('zh-TW');
        expect(Date.parse(payload.termsConsentedAt)).toBeGreaterThanOrEqual(before);
    });

    it('刷卡欄位渲染完才讓人送出，送出後把 BindCardPayToken 送回換卡的 create 並導去 3D', async () => {
        renderFlow();
        await consentAndStart('同意並綁定新卡');

        const submit = await screen.findByRole('button', { name: '綁定新卡' });
        await waitFor(() => expect(submit).toBeEnabled());
        expect(renderBindCardForm).toHaveBeenCalledWith({ token: 'ecpg-token', language: 'zh-TW' });

        await userEvent.click(submit);

        await waitFor(() => expect(createCardUpdateBind).toHaveBeenCalledWith({
            merchantTradeNo: 'CU-1',
            bindCardPayToken: 'pay-token',
            disclosedGrace: false
        }));
        expect(goToThreeDVerification).toHaveBeenCalledWith('https://ecpg.ecpay.com.tw/3d/abc');
    });

    // 後端拿 disclosedGrace 比對當下是否在寬限期，不一致就回 409，避免沒看過扣款揭露的人被立即扣款。
    it('寬限期頁面的 start 與 create 都送 disclosedGrace: true', async () => {
        fetchPaymentMethod.mockResolvedValue(GRACE_MONTHLY);
        renderFlow();
        await consentAndStart('同意並綁定新卡，付款 199 元');
        await submitCard();

        await waitFor(() => expect(createCardUpdateBind).toHaveBeenCalledWith({
            merchantTradeNo: 'CU-1',
            bindCardPayToken: 'pay-token',
            disclosedGrace: true
        }));
        expect(startCardUpdate.mock.calls[0][0].disclosedGrace).toBe(true);
    });

    it.each([
        ['平常', method(), '同意並綁定新卡', '/zh-TW/payment/card-update/result?status=pending&charging=0'],
        ['寬限期', GRACE_MONTHLY, '同意並綁定新卡，付款 199 元', '/zh-TW/payment/card-update/result?status=pending&charging=1']
    ])('%s不需要 3D 時導到換卡結果頁的確認中狀態', async (label, paymentMethod, startName, url) => {
        fetchPaymentMethod.mockResolvedValue(paymentMethod);
        createCardUpdateBind.mockResolvedValue({ threeDUrl: null });
        renderFlow();
        await consentAndStart(startName);
        await submitCard();

        await waitFor(() => expect(window.location.assign).toHaveBeenCalledWith(url));
        expect(goToThreeDVerification).not.toHaveBeenCalled();
        expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();
    });

    it.each([
        ['start', () => startCardUpdate.mockRejectedValue(STATE_CHANGED), async () => {}],
        ['create', () => createCardUpdateBind.mockRejectedValue(STATE_CHANGED), submitCard]
    ])('%s 回 409 CARD_UPDATE_STATE_CHANGED 時只給重新整理，不能用舊頁面繼續', async (label, arrange, afterStart) => {
        arrange();
        renderFlow();
        await consentAndStart('同意並綁定新卡');
        await afterStart();

        expect(await screen.findByText(STATE_CHANGED_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '重新試一次' })).not.toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '綁定新卡' })).not.toBeInTheDocument();

        await userEvent.click(screen.getByRole('button', { name: '重新整理' }));
        expect(window.location.reload).toHaveBeenCalledTimes(1);
    });

    it.each([
        ['data.data.errorCode', { response: { status: 409, data: { data: { errorCode: 'CARD_UPDATE_NOT_AVAILABLE' } } } }],
        ['data.errorCode', { response: { status: 409, data: { errorCode: 'CARD_UPDATE_NOT_AVAILABLE' } } }]
    ])('409 CARD_UPDATE_NOT_AVAILABLE（%s）說的是沒有可換卡的訂閱，不是一般錯誤', async (label, error) => {
        startCardUpdate.mockRejectedValue(error);
        renderFlow();
        await consentAndStart('同意並綁定新卡');

        expect(await screen.findByText('這個帳號目前沒有可以更換卡片的訂閱。')).toBeInTheDocument();
        expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();
    });

    it('Token 過期時與試用流程一樣給重新開始，不是一般錯誤', async () => {
        renderBindCardForm.mockRejectedValue(Object.assign(new Error('expired'), { code: 'TOKEN_EXPIRED' }));
        renderFlow();
        await consentAndStart('同意並綁定新卡');

        expect(await screen.findByText('這次綁卡已超過有效時間，請重新試一次。')).toBeInTheDocument();
        expect(screen.queryByText(GENERIC_ERROR)).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '重新試一次' })).toBeInTheDocument();
    });

    it('沒有綁卡訂閱（method 為 null）時不給表單', async () => {
        fetchPaymentMethod.mockResolvedValue(null);
        renderFlow();

        expect(await screen.findByText('這個帳號目前沒有可以更換卡片的訂閱。')).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
    });

    // 查不到是不是寬限期時退回平常版本，寬限期的人會在沒看到扣款揭露的情況下被扣款。
    it('查付款方式失敗時不退回平常版本，不給表單', async () => {
        fetchPaymentMethod.mockRejectedValue(new Error('boom'));
        renderFlow();

        expect(await screen.findByText(GENERIC_ERROR)).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(screen.queryByText(VERIFICATION)).not.toBeInTheDocument();
    });

    it('扣款還在確認中時不給表單，只顯示確認中', async () => {
        fetchPaymentMethod.mockResolvedValue(method({ inGrace: true, graceUntil: '2026-09-20T16:00:00Z', chargePending: true }));
        renderFlow();

        expect(await screen.findByText(CHARGE_PENDING_MESSAGE)).toBeInTheDocument();
        expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
        expect(startCardUpdate).not.toHaveBeenCalled();
    });

    it('送出時後端回扣款確認中（409）：顯示確認中，只給重新整理', async () => {
        fetchPaymentMethod.mockResolvedValue(method());
        startCardUpdate.mockRejectedValue(CHARGE_PENDING);
        renderFlow();

        await consentAndStart('同意並綁定新卡');

        expect(await screen.findByText(CHARGE_PENDING_MESSAGE)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '重新整理' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '重新試一次' })).not.toBeInTheDocument();
    });

});
