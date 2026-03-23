import React, { useCallback } from 'react';
import PropTypes from 'prop-types';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { StockCard } from './StockCard';
import { StockListHeaderRow } from './StockListHeaderRow';
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

    if (!stocks || stocks.length === 0) {
        return null;
    }

    return (
        <>
            <StockListHeaderRow />
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
                                            {...provided.dragHandleProps}
                                            className={`stock-row-wrapper draggable-stock-wrapper ${snapshot.isDragging ? 'dragging' : ''}`}
                                        >
                                            <StockCard
                                                stock={stock}
                                                onRemove={() => onRemoveStock(categoryId, stock.id)}
                                                onNewsClick={onNewsClick}
                                                isFirstInCategory={index === 0}
                                                showRemoveButton
                                                isEditing
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
