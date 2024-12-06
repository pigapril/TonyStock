import React, { useState, useCallback, useMemo } from 'react';
import { Dialog } from '../../Common/Dialog';
import { FaSearch } from 'react-icons/fa';
import debounce from 'lodash/debounce';
import { getErrorMessage } from '../../../utils/errorHandler';
import watchlistService from '../services/watchlistService';
import '../styles/AddStockDialog.css';

export function AddStockDialog({ open, onClose, categoryId, onAdd }) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const handleInputChange = (e) => {
        const value = e.target.value;
        setKeyword(value);
        
        const processedValue = value
            .replace(/[０-９Ａ-Ｚａ-ｚ]/g, char => 
                String.fromCharCode(char.charCodeAt(0) - 0xFEE0)
            )
            .replace(/[^A-Za-z0-9]/g, '')
            .toUpperCase();
            
        if (processedValue) {
            debouncedSearch(processedValue);
        } else {
            setResults([]);
        }
    };

    const searchStocks = useCallback(async (value) => {
        if (!value.trim()) {
            setResults([]);
            return;
        }

        setSearchLoading(true);
        try {
            const data = await watchlistService.searchStocks(value);
            setResults(data.results);
        } catch (error) {
            setSearchError(getErrorMessage(error));
        } finally {
            setSearchLoading(false);
        }
    }, []);

    const debouncedSearch = useMemo(
        () => debounce(searchStocks, 300),
        [searchStocks]
    );

    return (
        <Dialog open={open} onClose={onClose} title="搜尋股票代碼">
            <div className="add-stock-dialog">
                <div className="search-container">
                    <span className="search-icon">
                        <FaSearch />
                    </span>
                    <input
                        type="text"
                        value={keyword}
                        onChange={handleInputChange}
                        placeholder="搜尋股票代號或名稱..."
                        className="search-input"
                    />
                </div>
                
                <div className="search-results-container">
                    {searchLoading ? (
                        <div className="search-loading">
                            <div className="spinner" />
                            <span>搜尋中...</span>
                        </div>
                    ) : searchError ? (
                        <div className="search-empty-state">
                            <span className="icon">⚠️</span>
                            <span className="message">{searchError}</span>
                        </div>
                    ) : results.length === 0 && keyword.trim() ? (
                        <div className="search-empty-state">
                            <span className="icon">🔍</span>
                            <span className="message">找不到符合的股票</span>
                        </div>
                    ) : results.length > 0 ? (
                        <div className="search-results">
                            {results.map((stock) => (
                                <div
                                    key={stock.symbol}
                                    className="stock-result-item"
                                    onClick={() => {
                                        onAdd(categoryId, stock);
                                        onClose();
                                    }}
                                >
                                    <span className="stock-symbol">{stock.symbol}</span>
                                    <span className="stock-name">{stock.name}</span>
                                    <span 
                                        className="stock-market"
                                        data-market={stock.market}
                                    >
                                        {stock.market}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : null}
                </div>
            </div>
        </Dialog>
    );
} 