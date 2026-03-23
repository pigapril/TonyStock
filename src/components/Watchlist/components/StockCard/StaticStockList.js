import React from 'react';
import PropTypes from 'prop-types';
import { StockCard } from './StockCard';
import { StockListHeaderRow } from './StockListHeaderRow';

export function StaticStockList({
    stocks,
    categoryId,
    onRemoveStock,
    onNewsClick
}) {
    if (!stocks?.length) {
        return null;
    }

    return (
        <>
            <StockListHeaderRow />
            <div className="stock-list" data-testid="static-stock-list">
                {stocks.map((stock, index) => (
                    <div
                        key={stock.id}
                        className="stock-row-wrapper stock-row-wrapper--static"
                    >
                        <StockCard
                            stock={stock}
                            onRemove={() => onRemoveStock(categoryId, stock.id)}
                            onNewsClick={onNewsClick}
                            isFirstInCategory={index === 0}
                            showRemoveButton={false}
                            isEditing={false}
                        />
                    </div>
                ))}
            </div>
        </>
    );
}

StaticStockList.propTypes = {
    stocks: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            symbol: PropTypes.string.isRequired
        })
    ).isRequired,
    categoryId: PropTypes.string.isRequired,
    onRemoveStock: PropTypes.func.isRequired,
    onNewsClick: PropTypes.func.isRequired
};
