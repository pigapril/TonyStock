import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Dialog } from '../../Common/Dialog/Dialog';
import '../styles/EditCategoryDialog.css';
import { useTranslation } from 'react-i18next';

export const EditCategoryDialog = ({ open, onClose, category, onSubmit }) => {
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

    useEffect(() => {
        if (category) {
            setName(category.name);
            setError('');
        }
    }, [category]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (name.trim().length === 0) {
            setError(t('watchlist.categoryDialogErrors.emptyName'));
            return;
        }
        if (getStringLength(name) > MAX_LENGTH) {
            setError(t('watchlist.categoryDialogErrors.nameTooLongChars', { maxLength: MAX_LENGTH }));
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
            setError(t('watchlist.categoryDialogErrors.nameTooLongGeneric'));
        }
    };

    return (
        <Dialog open={open} onClose={onClose} title={t('watchlist.editCategoryDialog.title')}>
            <form onSubmit={handleSubmit} className="edit-category-form">
                <div className="input-container">
                    <input
                        type="text"
                        value={name}
                        onChange={handleChange}
                        placeholder={t('watchlist.editCategoryDialog.placeholder')}
                        required
                    />
                </div>
                {error && <div className="error-message">{error}</div>}
                <div className="dialog-actions">
                    <button type="submit">{t('watchlist.editCategoryDialog.confirmButton')}</button>
                    <button type="button" onClick={onClose}>{t('watchlist.editCategoryDialog.cancelButton')}</button>
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