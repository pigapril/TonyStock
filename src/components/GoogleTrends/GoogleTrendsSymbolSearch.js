import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import PropTypes from 'prop-types';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import { useTranslation } from 'react-i18next';
import { translateApiError } from '../../utils/errorHandler';
import { fetchStockSuggestions } from './googleTrends.service';
import '../Loading/Loading.css';
import './GoogleTrendsSymbolSearch.css';

const GoogleTrendsSymbolSearch = ({ onSearch }) => {
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
                results: data.slice(0, 4),
                loading: false
            }));
        } catch (error) {
            const errorMessage = translateApiError(error, t);
            setSearchState(prev => ({
                ...prev,
                error: errorMessage,
                loading: false
            }));
        }
    }, [t]);

    const debouncedSearch = useMemo(() => debounce(searchStocksAPI, 300), [searchStocksAPI]);

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
                <span className="search-icon">
                    <FaSearch />
                </span>
                <input
                    type="text"
                    value={searchState.keyword}
                    onChange={handleSearchInput}
                    placeholder={t('googleTrendsSearch.placeholder')}
                    className="search-input"
                />
            </div>
            {searchState.showResults && (
                <div className="search-results-container">
                    {searchState.loading ? (
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <span>{t('googleTrendsSearch.searching')}</span>
                        </div>
                    ) : searchState.error ? (
                        <div className="search-empty-state">
                            <span className="icon">{t('googleTrendsSearch.errorIcon')}</span>
                            <span className="message">{searchState.error}</span>
                        </div>
                    ) : searchState.results.length === 0 && searchState.keyword.trim() ? (
                        <div className="search-empty-state">
                            <span className="icon">{t('googleTrendsSearch.noResultsIcon')}</span>
                            <span className="message">{t('googleTrendsSearch.noResults')}</span>
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

GoogleTrendsSymbolSearch.propTypes = {
    onSearch: PropTypes.func.isRequired,
};

export default GoogleTrendsSymbolSearch; 