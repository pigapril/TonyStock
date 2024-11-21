import React, { useState, useEffect, useContext, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { useDialog } from '../../hooks/useDialog';
import { Dialog } from '../Common/Dialog';
import { Analytics } from '../../utils/analytics';
import { handleApiError, getErrorMessage } from '../../utils/errorHandler';
import './styles/Watchlist.css';
import debounce from 'lodash/debounce';

// Watchlist API 服務
class WatchlistService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
    }

    async getCategories() {
        try {
            const response = await fetch(`${this.baseUrl}/api/watchlist/categories`, {
                credentials: 'include'
            });
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async addStock(categoryId, stockSymbol) {
        try {
            const response = await fetch(`${this.baseUrl}/api/watchlist/categories/${categoryId}/stocks`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ stockSymbol })
            });
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async removeStock(categoryId, itemId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/watchlist/categories/${categoryId}/stocks/${itemId}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async searchStocks(keyword) {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`,
                { credentials: 'include' }
            );
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async createCategory(name) {
        try {
            const response = await fetch(`${this.baseUrl}/api/watchlist/categories`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name })
            });
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async deleteCategory(categoryId) {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/watchlist/categories/${categoryId}`,
                {
                    method: 'DELETE',
                    credentials: 'include'
                }
            );
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }

    async updateCategory(categoryId, name) {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/watchlist/categories/${categoryId}`,
                {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ name })
                }
            );
            if (!response.ok) throw await response.json();
            return (await response.json()).data;
        } catch (error) {
            throw handleApiError(error);
        }
    }
}

const watchlistService = new WatchlistService();

// 添加股票對話框元件
function AddStockDialog({ categoryId, onAdd, onClose }) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const debouncedSearch = useCallback(
        debounce(async (value) => {
            if (!value.trim()) return;

            setLoading(true);
            try {
                const data = await watchlistService.searchStocks(value);
                setResults(data.results);
                Analytics.ui.search({
                    type: 'stock',
                    keyword: value,
                    resultsCount: data.results.length
                });
            } catch (error) {
                setError(getErrorMessage(error.errorCode));
                Analytics.error({
                    component: 'AddStockDialog',
                    action: 'search',
                    error: error.message
                });
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    const handleAddStockToCategory = async (stock) => {
        try {
            await watchlistService.addStock(categoryId, stock.symbol);
            showToast(`已添加 ${stock.symbol} 到追蹤清單`, 'success');
            onAdd();  // 通知父元件更新
            Analytics.watchlist.stockAdd({
                categoryId,
                symbol: stock.symbol
            });
        } catch (error) {
            showToast(error.message, 'error');
            Analytics.error({
                component: 'AddStockDialog',
                action: 'add_stock',
                error: error.message
            });
        }
    };

    return (
        <Dialog
            open={true}
            onClose={onClose}
            title="添加股票"
            description="搜尋並添加股票到您的追蹤清單"
        >
            <div className="add-stock-dialog">
                <input
                    type="text"
                    value={keyword}
                    onChange={(e) => {
                        setKeyword(e.target.value);
                        debouncedSearch(e.target.value);
                    }}
                    placeholder="輸入股票代碼或名稱..."
                    className="stock-search-input"
                />
                
                {loading && <div className="loading">搜尋中...</div>}
                {error && <div className="error-message">{error}</div>}
                
                <div className="search-results">
                    {results.map((stock) => (
                        <button
                            key={stock.symbol}
                            onClick={() => handleAddStockToCategory(stock)}
                            className="stock-result-item"
                        >
                            <span className="stock-symbol">{stock.symbol}</span>
                            <span className="stock-name">{stock.name}</span>
                            {stock.market && (
                                <span className="stock-market">{stock.market}</span>
                            )}
                        </button>
                    ))}
                </div>
            </div>
        </Dialog>
    );
}

// 添加自動完成搜尋框元件
const StockSearchInput = ({ onSelect }) => {
    const [keyword, setKeyword] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);

    const debouncedSearch = useCallback(
        debounce(async (searchKeyword) => {
            if (!searchKeyword) {
                setSuggestions([]);
                return;
            }
            setLoading(true);
            try {
                const { results } = await watchlistService.searchStocks(searchKeyword);
                setSuggestions(results);
            } catch (error) {
                console.error('搜尋失敗:', error);
            } finally {
                setLoading(false);
            }
        }, 300),
        []
    );

    return (
        <div className="stock-search">
            <input
                type="text"
                value={keyword}
                onChange={(e) => {
                    setKeyword(e.target.value);
                    debouncedSearch(e.target.value);
                }}
                placeholder="搜尋股票代碼..."
                className="stock-search-input"
            />
            {loading && <div className="search-loading">搜尋中...</div>}
            {suggestions.length > 0 && (
                <ul className="search-suggestions">
                    {suggestions.map((stock) => (
                        <li
                            key={stock.symbol}
                            onClick={() => {
                                onSelect(stock);
                                setKeyword('');
                                setSuggestions([]);
                            }}
                            className="suggestion-item"
                        >
                            <span className="stock-symbol">{stock.symbol}</span>
                            <span className="stock-name">{stock.name}</span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

// 添加 Toast 通知元件
const Toast = ({ message, type, onClose }) => (
    <div className={`toast toast-${type}`}>
        {message}
        <button onClick={onClose}>✕</button>
    </div>
);

// Watchlist 主元件
export function WatchlistContainer() {
    const { user } = useAuth();
    const { openDialog } = useDialog();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [toast, setToast] = useState(null);
    const [showAddCategory, setShowAddCategory] = useState(false);
    const [selectedCategoryForEdit, setSelectedCategoryForEdit] = useState(null);

    const loadCategories = async () => {
        try {
            const { categories } = await watchlistService.getCategories();
            setCategories(categories);
        } catch (error) {
            console.error('Failed to load categories:', error);
            setError(getErrorMessage(error.errorCode));
        }
    };

    useEffect(() => {
        if (user) {
            loadCategories();
        }
    }, [user, loadCategories]);

    useEffect(() => {
        if (categories.length === 0) {
            // 檢查是否需要創建預設分類
            const createDefaultCategory = async () => {
                try {
                    const defaultCategory = await watchlistService.createCategory('ETF');
                    await watchlistService.addStock(defaultCategory.id, 'SPY');
                    await watchlistService.addStock(defaultCategory.id, '0050.TW');
                    loadCategories();
                } catch (error) {
                    setError(getErrorMessage(error.errorCode));
                }
            };
            createDefaultCategory();
        }
    }, [categories]);

    const handleOpenAddStockDialog = (categoryId) => {
        setSelectedCategory(categoryId);
        Analytics.button.click({
            component: 'WatchlistContainer',
            action: 'open_add_stock_dialog',
            categoryId
        });
    };

    const handleRemoveStock = async (categoryId, itemId) => {
        try {
            await watchlistService.removeStock(categoryId, itemId);
            loadCategories();
            Analytics.button.click({
                component: 'WatchlistContainer',
                action: 'remove_stock',
                categoryId,
                itemId
            });
        } catch (error) {
            setError(getErrorMessage(error.errorCode));
        }
    };

    const handleCreateCategory = () => {
        setShowAddCategory(true);
    };

    const handleEditCategory = (categoryId) => {
        setSelectedCategoryForEdit(categoryId);
    };

    const ErrorBoundary = ({ children }) => {
        const [hasError, setHasError] = useState(false);
        
        if (hasError) {
            return (
                <div className="error-boundary">
                    <h2>很抱歉，發生了一些問題</h2>
                    <button onClick={() => {
                        setHasError(false);
                        loadCategories();
                    }}>
                        重試
                    </button>
                </div>
            );
        }
        
        return children;
    };

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    if (loading) {
        return <div className="loading-container">載入中...</div>;
    }

    if (error) {
        return <div className="error-container">{error}</div>;
    }

    return (
        <ErrorBoundary>
            <div className="watchlist-container">
                <div className="watchlist-header">
                    <h1>我的追蹤清單</h1>
                    <button 
                        onClick={handleCreateCategory}
                        className="create-category-button"
                        aria-label="新增分類"
                    >
                        新增分類
                    </button>
                </div>
                
                {categories.length === 0 && (
                    <div className="empty-state">
                        <p>您還沒有任何追蹤清單</p>
                        <button onClick={handleCreateCategory}>
                            建立第一個分類
                        </button>
                    </div>
                )}
                
                {loading && (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>載入中...</p>
                    </div>
                )}
                
                {categories.map((category) => (
                    <div key={category.id} className="watchlist-category">
                        <div className="category-header">
                            <h2>{category.name}</h2>
                            <div className="category-actions">
                                {!category.isDefault && (
                                    <>
                                        <button
                                            onClick={() => handleEditCategory(category.id)}
                                            className="edit-category-button"
                                            aria-label="編輯分類"
                                        >
                                            ✎
                                        </button>
                                        <button
                                            onClick={() => handleDeleteCategory(category.id)}
                                            className="delete-category-button"
                                            aria-label="刪除分類"
                                        >
                                            🗑
                                        </button>
                                    </>
                                )}
                                <button
                                    onClick={() => handleOpenAddStockDialog(category.id)}
                                    className="add-stock-button"
                                >
                                    添加股票
                                </button>
                            </div>
                        </div>
                        
                        <div className="stock-list">
                            {category.stocks.map((stock) => (
                                <div key={stock.id} className="stock-item">
                                    <span className="stock-symbol">
                                        {stock.symbol}
                                    </span>
                                    <button
                                        onClick={() => handleRemoveStock(category.id, stock.id)}
                                        className="remove-stock-button"
                                        aria-label={`移除 ${stock.symbol}`}
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}

                {showAddCategory && (
                    <AddCategoryDialog
                        onAdd={() => {
                            setShowAddCategory(false);
                            loadCategories();
                        }}
                        onClose={() => setShowAddCategory(false)}
                    />
                )}

                {selectedCategoryForEdit && (
                    <AddCategoryDialog
                        categoryId={selectedCategoryForEdit}
                        initialName={categories.find(c => c.id === selectedCategoryForEdit)?.name}
                        onAdd={() => {
                            setSelectedCategoryForEdit(null);
                            loadCategories();
                        }}
                        onClose={() => setSelectedCategoryForEdit(null)}
                    />
                )}

                {selectedCategory && (
                    <AddStockDialog
                        categoryId={selectedCategory}
                        onAddStock={handleAddStockToCategory}
                        onClose={() => setSelectedCategory(null)}
                    />
                )}

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </ErrorBoundary>
    );
}
