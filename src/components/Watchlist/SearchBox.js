import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import { getErrorMessage } from '../../utils/errorHandler';
import './styles/SearchBox.css';
import { useTranslation } from 'react-i18next';

export const SearchBox = ({ onSelect, watchlistService, categoryId }) => {
    const { t } = useTranslation();
    const searchRef = useRef(null);
    const [searchState, setSearchState] = useState({
        keyword: '',
        results: [],
        loading: false,
        error: null,
        showResults: false
    });

    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setSearchState(prev => ({
                    ...prev,
                    showResults: false
                }));
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const searchStocks = useCallback(async (value) => {
        if (!value.trim()) {
            setSearchState(prev => ({
                ...prev,
                results: [],
                loading: false
            }));
            return;
        }

        setSearchState(prev => ({
            ...prev,
            loading: true,
            error: null
        }));

        try {
            const data = await watchlistService.searchStocks(value);
            setSearchState(prev => ({
                ...prev,
                results: data,
                loading: false
            }));
        } catch (error) {
            setSearchState(prev => ({
                ...prev,
                error: getErrorMessage(error),
                loading: false
            }));
        }
    }, [watchlistService]);

    const debouncedSearch = useMemo(
        () => debounce(searchStocks, 300),
        [searchStocks]
    );

    const handleSearchInput = useCallback((e) => {
        const value = e.target.value;
        
        setSearchState(prev => ({
            ...prev,
            keyword: value,
            showResults: true
        }));
        
        const processedValue = value
            .replace(/[０-９Ａ-Ｚａ-ｚ]/g, char => 
                String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
            )
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase();
            
        if (processedValue) {
            debouncedSearch(processedValue);
        } else {
            setSearchState(prev => ({
                ...prev,
                results: [],
                loading: false
            }));
        }
    }, [debouncedSearch]);

    const handleSelect = useCallback((stock) => {
        if (!stock || !stock.symbol) {
            console.error('Invalid stock data:', stock);
            return;
        }
        onSelect(categoryId, {
            symbol: stock.symbol,
            name: stock.name,
            market: stock.market
        });
        setSearchState(prev => ({
            ...prev,
            keyword: '',
            results: [],
            showResults: false
        }));
    }, [categoryId, onSelect]);

    return (
        <div className="watchlist-search-area" ref={searchRef}>
            <div className="search-container">
                <span className="search-icon">
                    <FaSearch />
                </span>
                <input
                    type="text"
                    value={searchState.keyword}
                    onChange={handleSearchInput}
                    placeholder={t('watchlist.searchBox.placeholder')}
                    className="search-input"
                />
            </div>
            
            {searchState.showResults && (
                <div className="search-results-container">
                    {searchState.loading ? (
                        <div className="search-loading">
                            <div className="spinner" />
                            <span>{t('watchlist.searchBox.loading')}</span>
                        </div>
                    ) : searchState.error ? (
                        <div className="search-empty-state">
                            <span className="icon">⚠️</span>
                            <span className="message">{searchState.error}</span>
                        </div>
                    ) : searchState.results.length === 0 && searchState.keyword.trim() ? (
                        <div className="search-empty-state">
                            <span className="icon">🔍</span>
                            <span className="message">{t('watchlist.searchBox.noResults')}</span>
                        </div>
                    ) : searchState.results.length > 0 ? (
                        <div className="search-results">
                            {searchState.results.map((stock) => (
                                <div
                                    key={stock.symbol}
                                    className="stock-result-item"
                                    onClick={() => handleSelect(stock)}
                                >
                                    <span className="stock-symbol">{stock.symbol}</span>
                                    <span className="stock-name">{stock.name}</span>
                                    <span className="stock-market">{stock.market}</span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            )}
        </div>
    );
}; 