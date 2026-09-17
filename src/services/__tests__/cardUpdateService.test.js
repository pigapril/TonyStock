import apiClient from '../../api/apiClient';
import { createCardUpdateBind, startCardUpdate } from '../cardUpdateService';

jest.mock('../../api/apiClient', () => ({ get: jest.fn(), post: jest.fn() }));

const CONSENTED_AT = '2026-09-13T08:00:00.000Z';

// 後端拿 disclosedGrace 比對當下是否在寬限期。沒送的話後端無從判斷使用者看過哪一版揭露。
describe('cardUpdateService 送出頁面當下的寬限期揭露', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        apiClient.post.mockResolvedValue({ data: { status: 'success', data: {} } });
    });

    it.each([[true], [false]])('start 的 body 帶 disclosedGrace: %s', async (disclosedGrace) => {
        await startCardUpdate({ termsConsentedAt: CONSENTED_AT, termsVersion: 'card-update-v1', locale: 'zh-TW', disclosedGrace });

        expect(apiClient.post).toHaveBeenCalledWith('/api/payment/card-update/start', {
            termsConsentedAt: CONSENTED_AT,
            termsVersion: 'card-update-v1',
            locale: 'zh-TW',
            disclosedGrace
        });
    });

    it.each([[true], [false]])('create 的 body 帶 disclosedGrace: %s', async (disclosedGrace) => {
        await createCardUpdateBind({ merchantTradeNo: 'CU-1', bindCardPayToken: 'pay-token', disclosedGrace });

        expect(apiClient.post).toHaveBeenCalledWith('/api/payment/card-update/create', {
            merchantTradeNo: 'CU-1',
            bindCardPayToken: 'pay-token',
            disclosedGrace
        });
    });
});
