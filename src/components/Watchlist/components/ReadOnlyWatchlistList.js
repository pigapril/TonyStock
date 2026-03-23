import React from 'react';
import PropTypes from 'prop-types';
import { BrowseStockCard } from './BrowseStockCard';
import '../styles/ReadOnlyWatchlistList.css';

export function ReadOnlyWatchlistList({
    categories,
    onSelectStock,
    showCategoryHeaders = true,
    collapsible = false,
    collapsedCategoryIds = {},
    onToggleCategory
}) {
    if (!categories?.length) {
        return null;
    }

    return (
        <div className="read-only-watchlist">
            {categories.map((category) => {
                const isCollapsed = collapsible ? Boolean(collapsedCategoryIds?.[category.id]) : false;

                return (
                    <section key={category.id} className="read-only-watchlist__category">
                        {showCategoryHeaders ? (
                            <div
                                className={`read-only-watchlist__categoryHeader${isCollapsed ? ' is-collapsed' : ''}${collapsible ? ' is-collapsible' : ''}`}
                                onClick={collapsible ? (event) => onToggleCategory?.(category.id, event) : undefined}
                                onKeyPress={collapsible ? (event) => {
                                    if (event.key === 'Enter') {
                                        onToggleCategory?.(category.id, event);
                                    }
                                } : undefined}
                                role={collapsible ? 'button' : undefined}
                                tabIndex={collapsible ? 0 : undefined}
                            >
                                <div className="read-only-watchlist__categoryHeaderContent">
                                    <span className="read-only-watchlist__categoryTitle">{category.name}</span>
                                    <span className="read-only-watchlist__categoryCount">{category.stocks?.length || 0}</span>
                                </div>
                                {collapsible ? (
                                    <span className={`read-only-watchlist__collapseIcon${isCollapsed ? ' is-collapsed' : ''}`} aria-hidden="true">
                                        ▾
                                    </span>
                                ) : null}
                            </div>
                        ) : null}
                        {!isCollapsed ? (
                            <div className="read-only-watchlist__stocks">
                                {category.stocks?.map((stock, index) => (
                                    <BrowseStockCard
                                        key={stock.id || stock.symbol || stock.stockCode || `${category.id}-${index}`}
                                        stock={stock}
                                        onSelect={onSelectStock}
                                    />
                                ))}
                            </div>
                        ) : null}
                    </section>
                );
            })}
        </div>
    );
}

ReadOnlyWatchlistList.propTypes = {
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string,
            stocks: PropTypes.arrayOf(PropTypes.object)
        })
    ).isRequired,
    onSelectStock: PropTypes.func.isRequired,
    showCategoryHeaders: PropTypes.bool,
    collapsible: PropTypes.bool,
    collapsedCategoryIds: PropTypes.object,
    onToggleCategory: PropTypes.func
};
