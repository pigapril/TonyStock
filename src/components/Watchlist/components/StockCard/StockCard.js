import React, { memo } from 'react';
import { StockHeader } from './StockHeader';
import { StockAnalysis } from './StockAnalysis';
import { StockNews } from './StockNews';
import { RemoveButton } from './RemoveButton';
import '../../styles/StockCard.css';

export const StockCard = memo(function StockCard({
    stock,
    onNewsClick,
    onRemove
}) {
    return (
        <div className="stock-item">
            <StockHeader stock={stock} />
            <StockAnalysis 
                price={stock.price}
                analysis={stock.analysis}
            />
            <StockNews 
                news={stock.news}
                onNewsClick={onNewsClick}
            />
            <RemoveButton 
                symbol={stock.symbol}
                onRemove={() => onRemove(stock.id)}
            />
        </div>
    );
}); 