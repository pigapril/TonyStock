import React from 'react';
import { FaHeart } from 'react-icons/fa';
import '../../styles/RemoveButton.css';

export const RemoveButton = ({ symbol, onRemove }) => (
    <button
        onClick={onRemove}
        className="remove-stock-button"
        aria-label={`取消追蹤 ${symbol}`}
        title="取消追蹤"
    >
        <FaHeart />
    </button>
); 