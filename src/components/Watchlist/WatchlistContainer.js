import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
        console.log('WatchlistService initialized with baseUrl:', this.baseUrl);
    }

    // 獲取分類列表
    async getCategories() {
        try {
            console.log('開始獲取分類列表請求');
            const url = `${this.baseUrl}/api/watchlist/categories`;
            console.log('請求 URL:', url);

            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json'
                }
            });

            console.log('收到響應:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error('響應不成功:', errorData);
                throw errorData;
            }

            const responseData = await response.json();
            console.log('解析響應數據:', responseData);
            
            if (!responseData.data) {
                console.warn('響應數據缺少 data 字段:', responseData);
                return [];
            }

            return responseData.data.categories || [];
        } catch (error) {
            console.error('獲取分類失敗:', {
                error,
                message: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 創建新分類
    async createCategory(name) {
        try {
            const response = await fetch(`${this.baseUrl}/api/watchlist/categories`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({ name })
            });

            if (!response.ok) {
                throw await response.json();
            }

            return (await response.json()).data;
        } catch (error) {
            throw error;
        }
    }

    // 使用專門的 GET 請求方法
    async fetchGet(endpoint) {
        const url = `${this.baseUrl}${endpoint}`;
        console.log('發送 GET 請求:', {
            url,
            options: this.defaultOptions
        });

        try {
            const response = await fetch(url, {
                ...this.defaultOptions,
                method: 'GET'
            });

            console.log('收到 GET 響應:', {
                status: response.status,
                statusText: response.statusText
            });

            if (!response.ok) {
                const error = await response.json();
                console.error('GET 請求失敗:', error);
                throw error;
            }

            const data = await response.json();
            console.log('GET 請求成功:', data);
            return data;
        } catch (error) {
            console.error('GET 請求異常:', {
                endpoint,
                error: error.message,
                stack: error.stack
            });
            throw error;
        }
    }

    // 使用專門的 POST 請求方法
    async fetchPost(endpoint, data) {
        const options = {
            ...this.defaultOptions,
            method: 'POST',
            headers: {
                ...this.defaultOptions.headers,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        };
        
        const response = await fetch(`${this.baseUrl}${endpoint}`, options);
        if (!response.ok) throw await response.json();
        return response.json();
    }

    // 其他方法也使用新的請求方法
    async addStock(categoryId, stockSymbol) {
        try {
            return await this.fetchPost(
                `/api/watchlist/categories/${categoryId}/stocks`,
                { stockSymbol }
            );
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
    const { dialog, openDialog, closeDialog } = useDialog();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [categoryName, setCategoryName] = useState('');
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    const showToast = useCallback((message, type = 'info') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    }, []);

    const loadCategories = useCallback(async () => {
        console.log('開始載入觀察清單分類', {
            user: user?.id,
            timestamp: new Date().toISOString()
        });

        try {
            setLoading(true);
            console.log('發送獲取分類請求');
            
            const categories = await watchlistService.getCategories();
            console.log('獲取分類響應:', {
                categoriesCount: categories?.length,
                categories
            });

            setCategories(categories);
            setError(null);
            
            console.log('分類數據已更新到狀態');
        } catch (err) {
            console.error('載入分類失敗:', {
                error: err,
                message: err.message,
                stack: err.stack
            });
            
            setError(getErrorMessage(err));
            showToast(getErrorMessage(err), 'error');
        } finally {
            console.log('載入完成，更新 loading 狀態');
            setLoading(false);
        }
    }, [user, showToast]);

    useEffect(() => {
        console.log('WatchlistContainer useEffect 觸發', {
            hasUser: !!user,
            userId: user?.id
        });

        if (user) {
            loadCategories();
        }
    }, [user, loadCategories]);

    const handleOpenAddStockDialog = (categoryId) => {
        openDialog('addStock', {
            categoryId,
            onAdd: loadCategories,
            showToast
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
            setError(getErrorMessage(error));
            showToast(getErrorMessage(error), 'error');
        }
    };

    const handleCreateCategory = () => {
        openDialog('createCategory');
    };

    const handleEditCategory = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        openDialog('EDIT_CATEGORY_DIALOG', {
            categoryId,
            initialName: category?.name,
            onSave: async (name) => {
                try {
                    await watchlistService.updateCategory(categoryId, name);
                    showToast('分類已更新', 'success');
                    loadCategories();
                    closeDialog();
                } catch (error) {
                    showToast(error.message, 'error');
                }
            }
        });
    };

    const handleDeleteCategory = async (categoryId) => {
        try {
            // 確認對話框
            if (!window.confirm('確定要刪除此分類嗎？此操作無法復原。')) {
                return;
            }

            await watchlistService.deleteCategory(categoryId);
            showToast('分類已刪除', 'success');
            loadCategories();  // 重新載入分類列表
            
            // 記錄分析數據
            Analytics.watchlist.categoryDelete({
                categoryId,
                component: 'WatchlistContainer',
                action: 'delete_category'
            });
        } catch (error) {
            showToast(error.message, 'error');
            Analytics.error({
                component: 'WatchlistContainer',
                action: 'delete_category',
                error: error.message
            });
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await watchlistService.createCategory(categoryName);
            closeDialog();
            setCategoryName('');  // 清空輸入
            await loadCategories();  // 重新載入表
            showToast('分類創建成功', 'success');
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        }
    };

    const ErrorBoundary = ({ children }) => {
        const [hasError, setHasError] = useState(false);
        
        if (hasError || error) {
            return (
                <div className="error-boundary">
                    <h2>很抱歉，發生了一些問題</h2>
                    <p>{error}</p>
                    <button onClick={() => {
                        setHasError(false);
                        setError(null);
                        loadCategories();
                    }}>
                        重試
                    </button>
                </div>
            );
        }
        
        return children;
    };

    // 修改 closeDialog 的處理方式
    const handleCloseDialog = () => {
        closeDialog();
        setCategoryName('');
    };

    // 搜尋股票的邏輯
    const searchStocks = useCallback(async (value) => {
        if (!value.trim()) {
            setResults([]);
            setSearchLoading(false);
            return;
        }

        setSearchLoading(true);
        try {
            const data = await watchlistService.searchStocks(value);
            setResults(data.results);
            Analytics.ui.search({
                type: 'stock',
                keyword: value,
                resultsCount: data.results.length
            });
        } catch (error) {
            setSearchError(getErrorMessage(error.errorCode));
            Analytics.error({
                component: 'AddStockDialog',
                action: 'search',
                error: error.message
            });
        } finally {
            setSearchLoading(false);
        }
    }, []);

    // 使用 debounce
    const debouncedSearchStocks = useMemo(
        () => debounce(searchStocks, 300),
        [searchStocks]
    );

    // 清理 debounce
    useEffect(() => {
        return () => {
            debouncedSearchStocks.cancel();
        };
    }, [debouncedSearchStocks]);

    // 處理輸入變更
    const handleInputChange = useCallback((e) => {
        const value = e.target.value;
        setKeyword(value);
        debouncedSearchStocks(value);
    }, [debouncedSearchStocks]);

    // 處理添加股票
    const handleAddStockToCategory = async (stock) => {
        try {
            await watchlistService.addStock(dialog.props.categoryId, stock.symbol);
            showToast(`已添加 ${stock.symbol} 到追蹤清單`, 'success');
            loadCategories();
            closeDialog();
            Analytics.watchlist.stockAdd({
                categoryId: dialog.props.categoryId,
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
        <ErrorBoundary>
            <div className="watchlist-container">
                <div className="watchlist-header">
                    <h1>我的追蹤清單</h1>
                    <button 
                        onClick={handleCreateCategory}
                        className="create-category-button"
                        disabled={loading}
                        aria-label="新增分類"
                    >
                        新增分類
                    </button>
                </div>
                
                {loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>載入中...</p>
                    </div>
                ) : (
                    <>
                        {categories.length === 0 ? (
                            <div className="empty-state">
                                <p>您還沒有任何追蹤清單</p>
                                <button onClick={handleCreateCategory}>
                                    建立第一個分類
                                </button>
                            </div>
                        ) : (
                            categories.map((category) => (
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
                            ))
                        )}
                    </>
                )}

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}

                <Dialog
                    open={dialog.isOpen && dialog.type === 'createCategory'}
                    onClose={handleCloseDialog}
                    title="新增分類"
                >
                    <form onSubmit={handleSubmit} className="add-category-form">
                        <input
                            type="text"
                            value={categoryName}
                            onChange={(e) => setCategoryName(e.target.value)}
                            placeholder="請輸入分類名稱"
                            required
                        />
                        <div className="dialog-actions">
                            <button type="submit">確認</button>
                            <button type="button" onClick={handleCloseDialog}>取消</button>
                        </div>
                    </form>
                </Dialog>

                <Dialog
                    open={dialog.isOpen && dialog.type === 'addStock'}
                    onClose={closeDialog}
                    title="添加股票"
                >
                    <div className="add-stock-dialog">
                        <input
                            type="text"
                            value={keyword}
                            onChange={handleInputChange}
                            placeholder="輸入股票代碼或名稱..."
                            className="stock-search-input"
                        />
                        
                        {searchLoading && <div className="loading">搜尋中...</div>}
                        {searchError && <div className="error-message">{searchError}</div>}
                        
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
            </div>
        </ErrorBoundary>
    );
}
