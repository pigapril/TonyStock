import React from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog/Dialog';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';
import '../styles/CategoryManagerDialog.css';

export const CategoryManagerDialog = ({ 
    open, 
    onClose, 
    categories, 
    onEdit, 
    onDelete, 
    onCreate 
}) => {
    return (
        <Dialog open={open} onClose={onClose} title="管理分類">
            <div className="category-manager-dialog">
                <button 
                    onClick={onCreate}
                    className="create-category-button"
                >
                    <FaPlus /> 新增分類
                </button>
                
                <div className="category-list">
                    {categories.map(category => (
                        <div key={category.id} className="category-item">
                            <span className="category-name">
                                {category.name}
                            </span>
                            <div className="category-actions">
                                <button
                                    onClick={() => onEdit(category.id)}
                                    className="edit-button"
                                    aria-label="編輯分類"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    onClick={() => onDelete(category.id)}
                                    className="delete-button"
                                    aria-label="刪除分類"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
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
    onCreate: PropTypes.func.isRequired
}; 