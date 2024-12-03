import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog';
import '../styles/EditCategoryDialog.css';

export const EditCategoryDialog = ({ open, onClose, category, onSubmit }) => {
    const [name, setName] = useState('');

    useEffect(() => {
        if (category) {
            setName(category.name);
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(name);  // 只執行更新，不處理關閉
    };

    return (
        <Dialog open={open} onClose={onClose} title="編輯分類">
            <form onSubmit={handleSubmit} className="edit-category-form">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入分類名稱"
                    required
                />
                <div className="dialog-actions">
                    <button type="submit">確認</button>
                    <button type="button" onClick={onClose}>取消</button>
                </div>
            </form>
        </Dialog>
    );
};

EditCategoryDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    category: PropTypes.shape({
        id: PropTypes.string.isRequired,
        name: PropTypes.string.isRequired
    }),
    onSubmit: PropTypes.func.isRequired
}; 