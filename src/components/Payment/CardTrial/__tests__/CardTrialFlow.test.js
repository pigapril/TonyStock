import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import CardTrialFlow from '../CardTrialFlow';
import { startCardTrial, createBindCard } from '../../../../services/cardTrialService';
import {
    goToThreeDVerification,
    renderBindCardForm,
    requestBindCardPayToken
} from '../../../../utils/ecpayBindCardSdk';
import i18n from '../../../../i18n';

let mockSearchParams = new URLSearchParams();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ lang: 'zh-TW' }),
    useSearchParams: () => [mockSearchParams]
}));

jest.mock('../../../../services/cardTrialService', () => ({
    startCardTrial: jest.fn(),
    createBindCard: jest.fn()
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

const renderFlow = () => render(
    <I18nextProvider i18n={i18n}>
        <CardTrialFlow />
    </I18nextProvider>
);

beforeEach(() => {
    mockSearchParams = new URLSearchParams();
});

const consentBox = () => screen.getByRole('checkbox');
const startButton = () => screen.getByRole('button', { name: '同意並綁定信用卡' });

describe('CardTrialFlow', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        jest.clearAllMocks();
        startCardTrial.mockResolvedValue({ merchantTradeNo: 'BC-1', token: 'ecpg-token' });
        renderBindCardForm.mockResolvedValue();
        requestBindCardPayToken.mockResolvedValue('pay-token');
        createBindCard.mockResolvedValue({ threeDUrl: 'https://ecpg.ecpay.com.tw/3d/abc' });
    });

    it('四項揭露在使用者做任何事之前就看得到', () => {
        renderFlow();

        expect(screen.getByText('試用期 30 天，期間可使用全部 Pro 功能')).toBeInTheDocument();
        expect(screen.getByText('綁定信用卡時會進行一筆 2 元的驗證，你不會被收取這筆費用')).toBeInTheDocument();
        expect(screen.getByText(/自動扣款 199 元，之後每月自動續費$/)).toBeInTheDocument();
        expect(screen.getByText('隨時可於帳戶頁面取消，取消後試用期仍可使用到期滿')).toBeInTheDocument();
    });

    it('?period=yearly 時揭露年繳句，start 送出 billingPeriod: yearly', async () => {
        mockSearchParams = new URLSearchParams('period=yearly');
        renderFlow();

        expect(screen.getByText(/自動扣款 1990 元，之後每年自動續費$/)).toBeInTheDocument();
        expect(screen.queryByText(/每月自動續費/)).not.toBeInTheDocument();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        await waitFor(() => expect(startCardTrial).toHaveBeenCalledTimes(1));
        expect(startCardTrial.mock.calls[0][0].billingPeriod).toBe('yearly');
    });

    it.each([[''], ['period=weekly'], ['period=YEARLY']])('period 沒帶或亂帶（"%s"）時當月繳', async (query) => {
        mockSearchParams = new URLSearchParams(query);
        renderFlow();

        expect(screen.getByText(/自動扣款 199 元，之後每月自動續費$/)).toBeInTheDocument();
        expect(screen.queryByText(/每年自動續費/)).not.toBeInTheDocument();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        await waitFor(() => expect(startCardTrial).toHaveBeenCalledTimes(1));
        expect(startCardTrial.mock.calls[0][0].billingPeriod).toBe('monthly');
    });

    it('沒勾同意就不能送出', async () => {
        renderFlow();

        expect(consentBox()).not.toBeChecked();
        expect(startButton()).toBeDisabled();

        await userEvent.click(startButton());

        expect(startCardTrial).not.toHaveBeenCalled();
    });

    it('同意的時間與版本隨著 start 一起送出', async () => {
        renderFlow();

        const before = Date.now();
        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        await waitFor(() => expect(startCardTrial).toHaveBeenCalledTimes(1));

        const [{ termsConsentedAt, termsVersion }] = startCardTrial.mock.calls[0];
        expect(termsVersion).toBe('card-trial-v2');
        expect(Date.parse(termsConsentedAt)).toBeGreaterThanOrEqual(before);
    });

    it('刷卡欄位渲染完才讓人按送出，按下去會把 BindCardPayToken 送回後端並導去 3D', async () => {
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        const submit = await screen.findByRole('button', { name: '開始試用' });
        await waitFor(() => expect(submit).toBeEnabled());
        expect(renderBindCardForm).toHaveBeenCalledWith({ token: 'ecpg-token', language: 'zh-TW' });
        expect(document.getElementById('ECPayPayment')).toBeInTheDocument();

        await userEvent.click(submit);

        await waitFor(() => expect(createBindCard).toHaveBeenCalledWith({
            merchantTradeNo: 'BC-1',
            bindCardPayToken: 'pay-token'
        }));
        expect(goToThreeDVerification).toHaveBeenCalledWith('https://ecpg.ecpay.com.tw/3d/abc');
    });

    it('Token 過期時給的是重新開始，不是一般錯誤', async () => {
        renderBindCardForm.mockRejectedValue(
            Object.assign(new Error('廠商驗證碼(Token)已失效，請重新操作'), { code: 'TOKEN_EXPIRED' })
        );
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        expect(await screen.findByText('這次綁卡已超過有效時間，請重新開始。')).toBeInTheDocument();
        expect(screen.queryByText('目前無法綁定信用卡，請稍後再試。')).not.toBeInTheDocument();
    });

    it('重新開始會把同意清掉，不沿用上一次的勾選', async () => {
        renderBindCardForm.mockRejectedValue(Object.assign(new Error('expired'), { code: 'TOKEN_EXPIRED' }));
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());
        await userEvent.click(await screen.findByRole('button', { name: '重新開始' }));

        expect(consentBox()).not.toBeChecked();
        expect(startButton()).toBeDisabled();
    });

    it('送出階段拿到過期 Token 一樣接得住', async () => {
        requestBindCardPayToken.mockRejectedValue(
            Object.assign(new Error('廠商驗證碼(Token)已失效，請重新操作'), { code: 'TOKEN_EXPIRED' })
        );
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        const submit = await screen.findByRole('button', { name: '開始試用' });
        await waitFor(() => expect(submit).toBeEnabled());
        await userEvent.click(submit);

        expect(await screen.findByText('這次綁卡已超過有效時間，請重新開始。')).toBeInTheDocument();
        expect(createBindCard).not.toHaveBeenCalled();
    });

    // 綠界 RtnCode=1 但不需要 3D 時，後端回 threeDUrl: null，試用由回呼建立。
    it('不需要 3D 時導到試用結果頁的確認中狀態，不當成失敗', async () => {
        const realLocation = window.location;
        delete window.location;
        window.location = { assign: jest.fn() };
        try {
            createBindCard.mockResolvedValue({ threeDUrl: null });
            renderFlow();

            await userEvent.click(consentBox());
            await userEvent.click(startButton());

            const submit = await screen.findByRole('button', { name: '開始試用' });
            await waitFor(() => expect(submit).toBeEnabled());
            await userEvent.click(submit);

            await waitFor(() => expect(window.location.assign)
                .toHaveBeenCalledWith('/zh-TW/payment/card-trial/result?status=pending'));
            expect(goToThreeDVerification).not.toHaveBeenCalled();
            expect(screen.queryByText('目前無法綁定信用卡，請稍後再試。')).not.toBeInTheDocument();
        } finally {
            window.location = realLocation;
        }
    });

    it('後端擋下重複試用時說的是資格，不是系統錯誤', async () => {
        startCardTrial.mockRejectedValue({
            response: { status: 409, data: { data: { errorCode: 'CARD_TRIAL_PREVIOUS_SUBSCRIBER' } } }
        });
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        expect(await screen.findByText('免費試用僅限首次訂閱的帳號。')).toBeInTheDocument();
    });

    it('被限流時說的是稍後再試', async () => {
        startCardTrial.mockRejectedValue({
            response: { status: 429, data: { errorCode: 'RATE_LIMIT_EXCEEDED' } }
        });
        renderFlow();

        await userEvent.click(consentBox());
        await userEvent.click(startButton());

        expect(await screen.findByText('嘗試次數過多，請稍後再試。')).toBeInTheDocument();
    });
});

// 扣款日是 Visa 要求的揭露之一，必須等於後端 trialEndAt 算出來、扣款 job 真正扣款的那一天。
describe('CardTrialFlow 揭露的扣款日期', () => {
    const renewalText = () => screen.getByText(/自動扣款 199 元/).textContent;
    const taipeiDate = (ms) => new Intl.DateTimeFormat('zh-TW', {
        timeZone: 'Asia/Taipei', year: 'numeric', month: 'long', day: 'numeric'
    }).format(new Date(ms));

    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    afterEach(() => {
        jest.restoreAllMocks();
        jest.useRealTimers();
    });

    it('台北下午綁卡，扣款日是滿 30 天之後的下一個台北午夜', () => {
        jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-12T06:00:00Z'));
        renderFlow();

        expect(renewalText()).toContain('將於 2026年10月13日 自動扣款');
    });

    it('剛好在台北午夜綁卡時不進位', () => {
        jest.spyOn(Date, 'now').mockReturnValue(Date.parse('2026-09-11T16:00:00Z'));
        renderFlow();

        expect(renewalText()).toContain('將於 2026年10月12日 自動扣款');
    });

    it('不是 Date.now() 加 30 天的台北日期', () => {
        const now = Date.parse('2026-09-12T06:00:00Z');
        jest.spyOn(Date, 'now').mockReturnValue(now);
        renderFlow();

        const naive = taipeiDate(now + 30 * 24 * 60 * 60 * 1000);
        expect(naive).toBe('2026年10月12日');
        expect(renewalText()).not.toContain(naive);
    });

    it('停在頁面跨過台北午夜後，揭露日期會更新', () => {
        jest.useFakeTimers();
        let now = Date.parse('2026-09-12T15:59:30Z');
        jest.spyOn(Date, 'now').mockImplementation(() => now);
        renderFlow();

        expect(renewalText()).toContain('將於 2026年10月13日 自動扣款');

        now = Date.parse('2026-09-12T16:00:30Z');
        act(() => {
            jest.advanceTimersByTime(60 * 1000);
        });

        expect(renewalText()).toContain('將於 2026年10月14日 自動扣款');
    });

    it('離開頁面時停掉計時器', () => {
        jest.useFakeTimers();
        const { unmount } = renderFlow();

        expect(jest.getTimerCount()).toBeGreaterThan(0);
        unmount();
        expect(jest.getTimerCount()).toBe(0);
    });
});
