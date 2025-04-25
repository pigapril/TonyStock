import React, { memo } from 'react';
import { useNavigate } from 'react-router-dom'; // 引入 useNavigate
import { StockHeader } from './StockHeader';
import { StockAnalysis } from './StockAnalysis';
import { StockNews } from './StockNews';
import { RemoveButton } from './RemoveButton';
import { formatPrice } from '../../../Common/priceUtils'; // Import formatPrice
import '../../styles/StockCard.css';

export const StockCard = memo(function StockCard({
    stock,
    onNewsClick,
    onRemove,
    isFirstInCategory
}) {
    const navigate = useNavigate(); // 獲取 navigate 函數
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
                    <span className="stock-header-title">股票代碼</span>
                    <span className="current-price-title">當前價格</span>
                    <span className="stock-analysis-title">價格分析</span>
                    <span className="stock-sentiment-title">當前情緒</span>
                    <span className="stock-news-title">新聞</span>
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

// New component for the analysis result
const StockAnalysisResult = memo(function StockAnalysisResult({ price, analysis }) {
    if (!analysis) {
        return <span className="status-label">分析中</span>;
    }

    const { tl_plus_2sd, tl_plus_sd, tl_minus_sd, tl_minus_2sd } = analysis;
    let sentiment = '中性';

    if (price >= tl_plus_2sd) {
        sentiment = '極度樂觀';
    } else if (price > tl_plus_sd) {
        sentiment = '樂觀';
    } else if (price <= tl_minus_2sd) {
        sentiment = '極度悲觀';
    } else if (price < tl_minus_sd) {
        sentiment = '悲觀';
    }

    return (
        <span className={`status-label status-${sentiment}`}>
            {sentiment}
        </span>
    );
});