import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog';
import '../styles/CreateCategoryDialog.css';

export const CreateCategoryDialog = ({ open, onClose, onSubmit }) => {
    const [name, setName] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(name);
        setName('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} title="新增分類">
            <form onSubmit={handleSubmit} className="create-category-form">
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

CreateCategoryDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired
}; 