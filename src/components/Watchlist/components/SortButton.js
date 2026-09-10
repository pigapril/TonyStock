import React from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { nextDirection } from '../utils/sortStocks';
import '../styles/SortControls.css';

const ARIA_KEYS = { asc: 'ariaAsc', desc: 'ariaDesc' };

/**
 * 三態排序按鈕：升冪 → 降冪 → 無排序。
 *
 * 方向不寫成文字，一組上下箭頭表達；亮起來的那一個就是目前的方向。
 * 桌機的表頭與手機的排序選單共用同一顆，兩邊的循環才不會走岔。
 */
export function SortButton({ column, label, sortState, onSortChange }) {
    const { t } = useTranslation();
    const direction = sortState?.key === column ? sortState.direction : null;

    return (
        <button
            type="button"
            className="sort-button"
            data-testid={`sort-button-${column}`}
            data-direction={direction || 'none'}
            aria-label={t(`watchlist.sort.${ARIA_KEYS[direction] || 'ariaNone'}`, { column: label })}
            onClick={() => onSortChange(column, nextDirection(direction))}
        >
            <span className="sort-button__label">{label}</span>
            <svg className="sort-button__arrows" viewBox="0 0 8 14" aria-hidden="true" focusable="false">
                <polygon className="sort-button__arrow sort-button__arrow--up" points="4,1 7.5,5.5 0.5,5.5" />
                <polygon className="sort-button__arrow sort-button__arrow--down" points="4,13 7.5,8.5 0.5,8.5" />
            </svg>
        </button>
    );
}

SortButton.propTypes = {
    column: PropTypes.oneOf(['symbol', 'price', 'sentiment']).isRequired,
    label: PropTypes.string.isRequired,
    sortState: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.string
    }),
    onSortChange: PropTypes.func.isRequired
};
