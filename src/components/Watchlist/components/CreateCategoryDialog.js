import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog/Dialog';
import '../styles/CreateCategoryDialog.css';

export const CreateCategoryDialog = ({ open, onClose, onSubmit }) => {
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
    
    const handleSubmit = (e) => {
        e.preventDefault();
        if (name.trim().length === 0) {
            setError('分類名稱不能為空');
            return;
        }
        if (getStringLength(name) > MAX_LENGTH) {
            setError(`名稱太長啦，縮短一點！`);
            return;
        }
        onSubmit(name.trim());
        setName('');
        setError('');
        onClose();
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
        <Dialog open={open} onClose={onClose} title="新增分類">
            <form onSubmit={handleSubmit} className="create-category-form">
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

CreateCategoryDialog.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    onSubmit: PropTypes.func.isRequired
}; 