import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { StockCard } from './StockCard';
import { FaGripVertical } from 'react-icons/fa';
import '../../styles/DragAndDrop.css';

/**
 * 可拖拉排序的股票列表
 */
export const DraggableStockList = ({
    stocks,
    categoryId,
    onRemoveStock,
    onReorder,
    onNewsClick
}) => {
    const handleDragEnd = useCallback((result) => {
        // 如果沒有有效的拖放目標，不做任何事
        if (!result.destination) {
            return;
        }

        // 如果位置沒有改變，不做任何事
        if (result.destination.index === result.source.index) {
            return;
        }

        // 重新排列股票陣列
        const reorderedStocks = Array.from(stocks);
        const [removed] = reorderedStocks.splice(result.source.index, 1);
        reorderedStocks.splice(result.destination.index, 0, removed);

        // 建立排序資料
        const orders = reorderedStocks.map((stock, index) => ({
            id: stock.id,
            sortOrder: index
        }));

        // 呼叫排序回調
        if (onReorder) {
            onReorder(categoryId, orders);
        }
    }, [stocks, categoryId, onReorder]);

    // 檢查是否為手機版
    const isMobile = () => window.innerWidth <= 640;

    // 定義 Header Row 元件
    const HeaderRow = () => {
        // 使用 react-i18next 的 hook (需要確認 import)
        // 由於 DraggableStockList 尚未引入 useTranslation，我們需要修改 import 或傳遞 t
        // 這裡為了簡單，假設我們將引入 useTranslation
        const { t } = require('react-i18next').useTranslation();

        if (isMobile()) return null;

        return (
            <div className="draggable-stock-wrapper header-wrapper" style={{ marginBottom: 0, backgroundColor: 'transparent', boxShadow: 'none' }}>
                {/* 隱藏的 Handle 佔位符，確保對齊 */}
                <div className="drag-handle" style={{ visibility: 'hidden' }}>
                    <FaGripVertical />
                </div>
                {/* Header 內容 */}
                <div className="stock-card-header-row" style={{ flex: 1, borderRadius: '8px' }}>
                    <span className="stock-header-title">{t('watchlist.stockCard.header.symbol')}</span>
                    <span className="current-price-title">{t('watchlist.stockCard.header.price')}</span>
                    <span className="stock-analysis-title">{t('watchlist.stockCard.header.analysis')}</span>
                    <span className="stock-sentiment-title">{t('watchlist.stockCard.header.sentiment')}</span>
                    <span className="stock-news-title">{t('watchlist.stockCard.header.news')}</span>
                </div>
            </div>
        );
    };

    if (!stocks || stocks.length === 0) {
        return null;
    }

    return (
        <>
            <HeaderRow />
            <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId={`stocks-${categoryId}`}>
                    {(provided, snapshot) => (
                        <div
                            className={`stock-list ${snapshot.isDraggingOver ? 'stock-list-droppable dragging-over' : ''}`}
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                        >
                            {stocks.map((stock, index) => (
                                <Draggable
                                    key={stock.id}
                                    draggableId={stock.id}
                                    index={index}
                                >
                                    {(provided, snapshot) => (
                                        <div
                                            ref={provided.innerRef}
                                            {...provided.draggableProps}
                                            className={`draggable-stock-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                                        >
                                            <div
                                                className="drag-handle"
                                                {...provided.dragHandleProps}
                                                aria-label="拖拉以重新排序"
                                            >
                                                <FaGripVertical />
                                            </div>
                                            <StockCard
                                                stock={stock}
                                                onRemove={() => onRemoveStock(categoryId, stock.id)}
                                                onNewsClick={onNewsClick}
                                                isFirstInCategory={index === 0}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>
        </>
    );
};

DraggableStockList.propTypes = {
    stocks: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            symbol: PropTypes.string.isRequired
        })
    ).isRequired,
    categoryId: PropTypes.string.isRequired,
    onRemoveStock: PropTypes.func.isRequired,
    onReorder: PropTypes.func,
    onNewsClick: PropTypes.func.isRequired
};

export default DraggableStockList;
