import React, { memo } from 'react';
import '../../styles/StockNews.css';

export const StockNews = memo(function StockNews({ news, onNewsClick }) {
    return (
        <div className="stock-news-list">
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