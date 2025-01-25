import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import debounce from 'lodash/debounce';
import { getErrorMessage } from '../../utils/errorHandler';
import { fetchStockSuggestions } from './googleTrends.service';

const GoogleTrendsSearch = ({ onSearch }) => {
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

    const searchStocksAPI = useCallback(async (value) => {
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
            const data = await fetchStockSuggestions(value);
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
    }, []);

    const debouncedSearch = useMemo(() => debounce(searchStocksAPI, 300), [searchStocksAPI]);

    const handleSearchInput = useCallback((e) => {
        const value = e.target.value;

        setSearchState(prev => ({
            ...prev,
            keyword: value,
            showResults: true
        }));

        if (value) {
            debouncedSearch(value);
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
        onSearch(stock.symbol);
        setSearchState(prev => ({
            ...prev,
            keyword: '',
            results: [],
            showResults: false
        }));
    }, [onSearch]);

    return (
        <div className="google-trends-search-area" ref={searchRef}>
            <div className="search-container">
                <input
                    type="text"
                    value={searchState.keyword}
                    onChange={handleSearchInput}
                    placeholder="輸入股票代號 (例如 TSLA)"
                    className="search-input"
                />
            </div>
            {searchState.showResults && (
                <div className="search-results-container">
                    {searchState.loading ? (
                        <div className="search-loading">
                            <div className="spinner" />
                            <span>搜尋中...</span>
                        </div>
                    ) : searchState.error ? (
                        <div className="search-empty-state">
                            <span className="icon">⚠️</span>
                            <span className="message">{searchState.error}</span>
                        </div>
                    ) : searchState.results.length === 0 && searchState.keyword.trim() ? (
                        <div className="search-empty-state">
                            <span className="icon">🔍</span>
                            <span className="message">找不到符合的股票</span>
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

GoogleTrendsSearch.propTypes = {
    onSearch: PropTypes.func.isRequired,
};

export default GoogleTrendsSearch; 