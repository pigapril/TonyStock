import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog';
import '../styles/EditCategoryDialog.css';

export const EditCategoryDialog = ({ open, onClose, category, onSubmit }) => {
    const [name, setName] = useState('');
    const [error, setError] = useState('');
    const MAX_LENGTH = 26;
    
    const getStringLength = (str) => {
        let length = 0;
        for (let char of str) {
            if (/[\u0000-\u00ff]/.test(char)) {
                length += 1;
            } else {
                length += 2;
            }
        }
        return length;
    };

    useEffect(() => {
        if (category) {
            setName(category.name);
            setError('');
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (name.trim().length === 0) {
            setError('分類名稱不能為空');
            return;
        }
        if (getStringLength(name) > MAX_LENGTH) {
            setError(`分類名稱不能超過 ${MAX_LENGTH} 個字元`);
            return;
        }
        await onSubmit(name.trim());
    };

    const handleChange = (e) => {
        const value = e.target.value;
        const newLength = getStringLength(value);
        
        if (newLength <= MAX_LENGTH) {
            setName(value);
            setError('');
        } else {
            setError(`名稱太長啦，縮短一點！`);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title="編輯分類">
            <form onSubmit={handleSubmit} className="edit-category-form">
                <div className="input-container">
                    <input
                        type="text"
                        value={name}
                        onChange={handleChange}
                        placeholder="請輸入分類名稱"
                        required
                    />
                </div>
                {error && <div className="error-message">{error}</div>}
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