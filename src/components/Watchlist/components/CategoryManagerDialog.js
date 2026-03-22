import React, { useCallback } from 'react';
import ReactDOM from 'react-dom';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog/Dialog';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { FaPlus, FaEdit, FaTrash, FaGripVertical } from 'react-icons/fa';
import '../styles/CategoryManagerDialog.css';
import '../styles/DragAndDrop.css';
import { useTranslation } from 'react-i18next';

export const CategoryManagerDialog = ({
    open,
    onClose,
    categories,
    onEdit,
    onDelete,
    onCreate,
    onReorder
}) => {
    const { t } = useTranslation();

    const handleDragEnd = useCallback((result) => {
        // 如果沒有有效的拖放目標，不做任何事
        if (!result.destination) {
            return;
        }

        // 如果位置沒有改變，不做任何事
        if (result.destination.index === result.source.index) {
            return;
        }

        // 重新排列分類陣列
        const reorderedCategories = Array.from(categories);
        const [removed] = reorderedCategories.splice(result.source.index, 1);
        reorderedCategories.splice(result.destination.index, 0, removed);

        // 建立排序資料
        const orders = reorderedCategories.map((category, index) => ({
            id: category.id,
            sortOrder: index
        }));

        // 呼叫排序回調
        if (onReorder) {
            onReorder(orders);
        }
    }, [categories, onReorder]);

    return (
        <Dialog open={open} onClose={onClose} title={t('watchlist.categoryManager.title', '管理分類')}>
            <div className="category-manager-dialog">
                {/* ... existing button */}
                <button
                    onClick={onCreate}
                    className="create-category-button"
                >
                    <FaPlus /> {t('watchlist.categoryManager.createCategory', '新增分類')}
                </button>

                <DragDropContext onDragEnd={handleDragEnd}>
                    <Droppable
                        droppableId="categories"
                        renderClone={(provided, snapshot, rubric) => {
                            const category = categories[rubric.source.index];
                            return ReactDOM.createPortal(
                                <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    className={`category-item ${snapshot.isDragging ? 'dragging' : ''}`}
                                    style={{
                                        ...provided.draggableProps.style,
                                        // 確保寬度一致，因為 Portal 到 body 後會失去父層寬度約束
                                        width: document.querySelector('.category-list')?.clientWidth || 300,
                                        // 確保層級最高
                                        zIndex: 9999
                                    }}
                                >
                                    <div
                                        className="drag-handle"
                                        {...provided.dragHandleProps}
                                    >
                                        <FaGripVertical />
                                    </div>
                                    <span className="category-name">
                                        {category.name}
                                    </span>
                                    <div className="category-actions">
                                        <button className="edit-button">
                                            <FaEdit />
                                        </button>
                                        <button className="delete-button">
                                            <FaTrash />
                                        </button>
                                    </div>
                                </div>,
                                document.body
                            );
                        }}
                    >
                        {(provided, snapshot) => (
                            <div
                                className={`category-list ${snapshot.isDraggingOver ? 'category-list-droppable dragging-over' : ''}`}
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                            >
                                {categories.map((category, index) => (
                                    <Draggable
                                        key={category.id}
                                        draggableId={category.id}
                                        index={index}
                                    >
                                        {(provided, snapshot) => (
                                            <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                className={`category-item ${snapshot.isDragging ? 'dragging-placeholder' : ''}`}
                                                style={provided.draggableProps.style}
                                            >
                                                <div
                                                    className="drag-handle"
                                                    {...provided.dragHandleProps}
                                                    aria-label={t('watchlist.categoryManager.dragToReorder', '拖拉以重新排序')}
                                                >
                                                    <FaGripVertical />
                                                </div>
                                                <span className="category-name">
                                                    {category.name}
                                                </span>
                                                <div className="category-actions">
                                                    <button
                                                        onClick={() => onEdit(category.id)}
                                                        className="edit-button"
                                                        aria-label={t('watchlist.categoryManager.editCategory', '編輯分類')}
                                                    >
                                                        <FaEdit />
                                                    </button>
                                                    <button
                                                        onClick={() => onDelete(category.id)}
                                                        className="delete-button"
                                                        aria-label={t('watchlist.categoryManager.deleteCategory', '刪除分類')}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </Dialog>
    );
};

CategoryManagerDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            id: PropTypes.string.isRequired,
            name: PropTypes.string.isRequired
        })
    ).isRequired,
    onEdit: PropTypes.func.isRequired,
    onDelete: PropTypes.func.isRequired,
    onCreate: PropTypes.func.isRequired,
    onReorder: PropTypes.func
};