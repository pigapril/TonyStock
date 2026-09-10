import React, { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { useTranslation } from 'react-i18next';
import { SortButton } from './SortButton';
import '../styles/SortControls.css';

/**
 * 手機的排序入口。
 *
 * 表頭在 640px 以下是隱藏的，點表頭排序在手機上等於沒有排序，
 * 所以窄螢幕改從工具列開這個選單，裡面放的是同一顆三態按鈕。
 */
export function SortMenu({ sortState, onSortChange }) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        if (!open) {
            return undefined;
        }

        const onPointerDown = (event) => {
            if (!wrapperRef.current?.contains(event.target)) {
                setOpen(false);
            }
        };
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('pointerdown', onPointerDown);
        document.addEventListener('keydown', onKeyDown);
        return () => {
            document.removeEventListener('pointerdown', onPointerDown);
            document.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const columns = [
        ['symbol', t('watchlist.stockCard.header.symbol')],
        ['price', t('watchlist.stockCard.header.price')],
        ['sentiment', t('watchlist.stockCard.header.sentiment')]
    ];

    return (
        <div className="watchlist-sort-menu" ref={wrapperRef}>
            <button
                type="button"
                className={`watchlist-sort-menu__trigger ${sortState?.key ? 'is-active' : ''}`}
                aria-label={t('watchlist.sort.menuLabel')}
                aria-expanded={open}
                data-testid="watchlist-sort-menu-trigger"
                onClick={() => setOpen((value) => !value)}
            >
                <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
                    <path d="M2 4h12M4 8h8M6 12h4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
            </button>

            {open ? (
                <div className="watchlist-sort-menu__panel" role="group" aria-label={t('watchlist.sort.menuLabel')}>
                    {columns.map(([column, label]) => (
                        <SortButton
                            key={column}
                            column={column}
                            label={label}
                            sortState={sortState}
                            onSortChange={onSortChange}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

SortMenu.propTypes = {
    sortState: PropTypes.shape({
        key: PropTypes.string,
        direction: PropTypes.string
    }),
    onSortChange: PropTypes.func.isRequired
};
