import React from 'react';
import { FaHeart } from 'react-icons/fa';
import { useTranslation } from 'react-i18next';
import '../../styles/RemoveButton.css';

export const RemoveButton = ({ symbol, onRemove }) => {
    const { t } = useTranslation();

    return (
        <button
            onClick={onRemove}
            className="remove-stock-button"
            aria-label={t('watchlist.stockCard.removeButton.ariaLabel', { symbol })}
            title={t('watchlist.stockCard.removeButton.title')}
        >
            <FaHeart />
        </button>
    );
}; 