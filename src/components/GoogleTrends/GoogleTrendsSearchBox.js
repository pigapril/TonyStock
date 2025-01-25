import React, { useState, useCallback, useRef, useEffect } from 'react';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import { getErrorMessage } from '../../utils/errorHandler';
import './styles/GoogleTrendsSearchBox.css';

export const GoogleTrendsSearchBox = ({ onSelect, googleTrendsService }) => {
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
            // 修改這裡，調用 googleTrendsService 的搜尋 API
            const data = await googleTrendsService.searchStocks(value); // 假設 googleTrendsService 有 searchStocks 方法
            setSearchState(prev => ({
                ...prev,
                results: data.results, // 假設返回結果結構相同
                loading: false
            }));
        } catch (error) {
            setSearchState(prev => ({
                ...prev,
                error: getErrorMessage(error),
                loading: false
            }));
        }
    }, [googleTrendsService]);

    const debouncedSearch = useCallback(
        debounce(value => searchStocks(value), 300),
        [searchStocks]
    );

    const handleSearchInput = useCallback((event) => {
        const value = event.target.value;
        setSearchState(prev => ({
            ...prev,
            keyword: value,
            showResults: !!value.trim(), // 有輸入時才顯示結果
            error: null // 清除錯誤訊息
        }));
        debouncedSearch(value);
    }, [debouncedSearch]);


    const handleSelect = useCallback((stock) => {
        if (!stock || !stock.symbol) {
            console.error('Invalid stock data:', stock);
            return;
        }
        onSelect(stock);
        setSearchState(prev => ({
            ...prev,
            keyword: '',
            results: [],
            showResults: false
        }));
    }, [onSelect]);

    return (
        <div className="googletrends-search-area" ref={searchRef}>
            <div className="search-container">
                <span className="search-icon">
                    <FaSearch />
                </span>
                <input
                    type="text"
                    value={searchState.keyword}
                    onChange={handleSearchInput}
                    placeholder="輸入股票代號"
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