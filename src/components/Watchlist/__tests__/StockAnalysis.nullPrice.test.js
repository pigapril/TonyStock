import React from 'react';
import { render, screen } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from '../../../i18n';
import { StockAnalysis } from '../components/StockCard/StockAnalysis';

// 價格取不到時（報價 API 失敗、代碼對應不上），null 會被比較運算子當成 0：
// price <= tl_minus_2sd 恆真 → 量表指針停在最左、塗成「極度恐懼」藍。
// 那是假訊號，比顯示「無資料」更糟。
describe('StockAnalysis 缺少價格時不給假訊號', () => {
    const analysis = {
        trendLine: 24.11,
        tl_minus_2sd: 14.34,
        tl_minus_sd: 19.2,
        tl_plus_sd: 29.0,
        tl_plus_2sd: 33.89
    };

    const renderWith = (price) => render(
        <I18nextProvider i18n={i18n}>
            <StockAnalysis price={price} analysis={analysis} />
        </I18nextProvider>
    );

    it('價格為 null 時顯示無資料狀態，不渲染量表', () => {
        const { container } = renderWith(null);

        expect(container.querySelector('.analysis-loading')).toBeInTheDocument();
        expect(container.querySelector('.stock-gauge-container')).not.toBeInTheDocument();
    });

    it('價格為 undefined 時同樣不渲染量表', () => {
        const { container } = renderWith(undefined);

        expect(container.querySelector('.stock-gauge-container')).not.toBeInTheDocument();
    });

    it('有正常價格時照常渲染量表與支撐壓力值', () => {
        const { container } = renderWith(35.69);

        expect(container.querySelector('.stock-gauge-container')).toBeInTheDocument();
        expect(container.querySelector('.analysis-loading')).not.toBeInTheDocument();
        // formatPrice 對 10–99 只保留一位小數
        expect(screen.getByText('14.3')).toBeInTheDocument();
        expect(screen.getByText('33.9')).toBeInTheDocument();
    });

    it('價格為 0 視為有效價格，仍渲染量表', () => {
        const { container } = renderWith(0);

        expect(container.querySelector('.stock-gauge-container')).toBeInTheDocument();
    });
});
