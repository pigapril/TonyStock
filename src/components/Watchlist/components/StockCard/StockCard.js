import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import { useTranslation } from 'react-i18next'; // 引入 useTranslation
import { StockHeader } from './StockHeader';
import { StockAnalysis } from './StockAnalysis';
import { StockNews } from './StockNews';
import { RemoveButton } from './RemoveButton';
import { formatPrice } from '../../../../utils/priceUtils'; // Import formatPrice
import { useAdContext } from '../../../../components/Common/InterstitialAdModal/AdContext'; // <--- 1. 導入 useAdContext
import '../../styles/StockCard.css';

// New component for the analysis result - Moved outside StockCard for clarity
const StockAnalysisResult = memo(function StockAnalysisResult({ price, analysis }) {
    const { t } = useTranslation(); // 使用 hook

    if (!analysis) {
        return <span className="status-label">{t('watchlist.stockCard.analysis.loading')}</span>;
    }

    const { tl_plus_2sd, tl_plus_sd, tl_minus_sd, tl_minus_2sd } = analysis;
    let sentimentKey = 'sentiment.neutral'; // 預設為中性

    if (price >= tl_plus_2sd) {
        sentimentKey = 'sentiment.extremeOptimism'; // 極度樂觀
    } else if (price > tl_plus_sd) {
        sentimentKey = 'sentiment.optimism'; // 樂觀
    } else if (price <= tl_minus_2sd) {
        sentimentKey = 'sentiment.extremePessimism'; // 極度悲觀
    } else if (price < tl_minus_sd) {
        sentimentKey = 'sentiment.pessimism'; // 悲觀
    }

    return (
        <span className={`status-label status-${sentimentKey.split('.')[1]}`}>
            {t(sentimentKey)}
        </span>
    );
});

export const StockCard = memo(function StockCard({
    stock,
    onNewsClick,
    onRemove,
    isFirstInCategory
}) {
    const navigate = useNavigate(); // 獲取 navigate 函數
    const { requestAdDisplay } = useAdContext(); // <--- 2. 獲取 requestAdDisplay
    const { t } = useTranslation(); // 在 StockCard 中也使用 hook
    // Function to check if it's a mobile screen (you can adjust the breakpoint if needed)
    const isMobile = () => window.innerWidth <= 640;

    // 點擊卡片時的處理函數
    const handleCardClick = (e) => {
        // 正向表列：檢查點擊目標是否在允許的區塊內
        const allowedSections = '.stock-header-section, .current-price-section, .stock-analysis-section, .stock-analysis-result-section';
        if (!e.target.closest(allowedSections)) {
            // 如果點擊的目標不在任何允許的區塊內，則不執行跳轉
            return;
        }

        // --- 3. 在導航前請求廣告顯示 ---
        // 使用 'watchlistCardClick' 作為來源，閾值設為 1 (可以按需調整)
        // requestAdDisplay('watchlistCardClick', 1);
        // --- 廣告請求結束 ---

        // 導航到 PriceAnalysis 頁面，並帶上參數和 state
        navigate(
            `/priceanalysis?stockCode=${stock.symbol}&years=3.5`,
            { state: { fromWatchlist: true } } // <--- 新增 state
        );
    };

    return (
        <>
            {isFirstInCategory && !isMobile() && (
                <div className="stock-card-header-row">
                    <span className="stock-header-title">{t('watchlist.stockCard.header.symbol')}</span>
                    <span className="current-price-title">{t('watchlist.stockCard.header.price')}</span>
                    <span className="stock-analysis-title">{t('watchlist.stockCard.header.analysis')}</span>
                    <span className="stock-sentiment-title">{t('watchlist.stockCard.header.sentiment')}</span>
                    <span className="stock-news-title">{t('watchlist.stockCard.header.news')}</span>
                </div>
            )}
            <div className="stock-item" onClick={handleCardClick} style={{ cursor: 'pointer' }}>
                <div className="stock-header-section">
                    <StockHeader stock={stock} />
                </div>
                <div className="current-price-section">
                    <span className="current-price">
                        ${formatPrice(stock.price)}
                    </span>
                </div>
                {isMobile() ? ( // Conditionally render for mobile
                    <div className="stock-analysis-container-mobile">
                        <div className="stock-analysis-section">
                            <StockAnalysis
                                price={stock.price}
                                analysis={stock.analysis}
                            />
                        </div>
                        <div className="stock-analysis-result-section">
                            <StockAnalysisResult
                                price={stock.price}
                                analysis={stock.analysis}
                            />
                        </div>
                    </div>
                ) : ( // Render for larger screens (desktop) - original structure
                    <>
                        <div className="stock-analysis-section">
                            <StockAnalysis
                                price={stock.price}
                                analysis={stock.analysis}
                            />
                        </div>
                        <div className="stock-analysis-result-section">
                            <StockAnalysisResult
                                price={stock.price}
                                analysis={stock.analysis}
                            />
                        </div>
                    </>
                )}
                <div className="stock-news-section">
                    <StockNews
                        news={stock.news}
                        onNewsClick={onNewsClick}
                    />
                </div>
                <div className="remove-button-section">
                    <RemoveButton
                        symbol={stock.symbol}
                        onRemove={() => onRemove(stock.id)}
                    />
                </div>
            </div>
        </>
    );
});