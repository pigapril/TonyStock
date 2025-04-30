import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog/Dialog';
import '../styles/CreateCategoryDialog.css';
import { useTranslation } from 'react-i18next';

export const CreateCategoryDialog = ({ open, onClose, onSubmit }) => {
    const { t } = useTranslation();
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
            setError(t('watchlist.categoryDialogErrors.emptyName'));
            return;
        }
        if (getStringLength(name) > MAX_LENGTH) {
            setError(t('watchlist.categoryDialogErrors.nameTooLongGeneric'));
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
            setError(t('watchlist.categoryDialogErrors.nameTooLongGeneric'));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={t('watchlist.createCategoryDialog.title')}>
            <form onSubmit={handleSubmit} className="create-category-form">
                <div className="input-container">
                    <input
                        type="text"
                        value={name}
                        onChange={handleChange}
                        placeholder={t('watchlist.createCategoryDialog.placeholder')}
                        required
                    />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="dialog-actions">
                    <button type="submit">{t('watchlist.createCategoryDialog.confirmButton')}</button>
                    <button type="button" onClick={onClose}>{t('watchlist.createCategoryDialog.cancelButton')}</button>
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