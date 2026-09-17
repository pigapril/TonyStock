import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import CardUpdateResult from '../CardUpdateResult';
import i18n from '../../../../i18n';

let mockSearchParams = new URLSearchParams();
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useParams: () => ({ lang: 'zh-TW' }),
    useSearchParams: () => [mockSearchParams],
    useNavigate: () => mockNavigate
}));

const renderResult = (query) => {
    mockSearchParams = new URLSearchParams(query);
    return render(
        <I18nextProvider i18n={i18n}>
            <CardUpdateResult />
        </I18nextProvider>
    );
};

const PENDING = ['正在確認結果', '銀行的回覆還在路上，稍後可於帳戶頁面查看。'];

describe('CardUpdateResult', () => {
    beforeAll(async () => {
        await i18n.changeLanguage('zh-TW');
    });

    beforeEach(() => {
        mockNavigate.mockClear();
    });

    it.each([
        ['status=success&charging=0', '卡片已更新', '之後的扣款會改用這張卡。'],
        ['status=success&charging=1', '卡片已更新', '我們正在用新卡扣款，完成後會寄收據給你。'],
        ['status=failed&charging=0', '卡片沒有更新', '這張卡沒有綁定成功，你沒有被收取任何費用。'],
        ['status=pending&charging=0', ...PENDING],
        ['status=success', ...PENDING],
        ['status=success&charging=yes', ...PENDING],
        ['', ...PENDING]
    ])('"%s" 顯示 %s', (query, title, body) => {
        renderResult(query);

        expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(title);
        expect(screen.getByText(body)).toBeInTheDocument();
    });

    it('按鈕回到帳戶頁的付款方式區塊', async () => {
        renderResult('status=success&charging=0');

        await userEvent.click(screen.getByRole('button', { name: '前往帳戶頁面' }));

        expect(mockNavigate).toHaveBeenCalledWith('/zh-TW/user-account#payment-method');
    });
});
