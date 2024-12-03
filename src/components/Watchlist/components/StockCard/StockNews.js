import React, { memo } from 'react';
import '../../styles/StockNews.css';

export const StockNews = memo(function StockNews({ news, onNewsClick }) {
    const newsCount = news?.length || 0;
    const newsClass = newsCount === 1 ? 'single-news' : newsCount === 2 ? 'two-news' : 'three-news';

    return (
        <div className={`stock-news-list ${newsClass}`}>
            {news?.slice(0, 3).map((newsItem, index) => (
                <div
                    key={index}
                    className="stock-news-item"
                    onClick={() => onNewsClick(newsItem)}
                    title={newsItem.title}
                >
                    {newsItem.title}
                </div>
            ))}
        </div>
    );
}); 