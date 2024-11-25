import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Dialog } from '../Common/Dialog';
import { Analytics } from '../../utils/analytics';
import { handleApiError, getErrorMessage } from '../../utils/errorHandler';
import './styles/Watchlist.css';
import debounce from 'lodash/debounce';

// Watchlist API 服務
class WatchlistService {
    constructor() {
        this.baseUrl = process.env.REACT_APP_API_BASE_URL || '';
        this.defaultOptions = {
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        };
    }

    async fetchRequest(endpoint, options = {}) {
        try {
            const url = `${this.baseUrl}${endpoint}`;
            console.log('發送請求:', { url, options });
            
            const requestOptions = {
                ...this.defaultOptions,
                ...options,
                headers: {
                    ...this.defaultOptions.headers,
                    ...options.headers
                }
            };

            const response = await fetch(url, requestOptions);
            
            if (!response.ok) {
                throw await handleApiError(response);
            }

            const data = await response.json();
            console.log('API 響應:', data);

            if (data.status === 'success' && data.data) {
                return data.data;
            }
            
            return data;
        } catch (error) {
            console.error('Request failed:', error);
            throw handleApiError(error);
        }
    }

    async getCategories() {
        const response = await this.fetchRequest('/api/watchlist/categories', {
            method: 'GET'
        });
        
        // 確保返回的是數組
        if (Array.isArray(response)) {
            return response;
        } else if (response.categories && Array.isArray(response.categories)) {
            return response.categories;
        }
        
        console.warn('Unexpected categories response format:', response);
        return [];
    }

    async createCategory(name) {
        return this.fetchRequest('/api/watchlist/categories', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name })
        });
    }

    async addStock(categoryId, stockSymbol) {
        return this.fetchRequest(`/api/watchlist/categories/${categoryId}/stocks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ stockSymbol })
        });
    }

    async removeStock(categoryId, itemId) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}/stocks/${itemId}`,
            { method: 'DELETE' }
        );
    }

    async searchStocks(keyword) {
        return this.fetchRequest(
            `/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`,
            { method: 'GET' }
        );
    }

    async deleteCategory(categoryId) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}`,
            { method: 'DELETE' }
        );
    }

    async updateCategory(categoryId, name) {
        return this.fetchRequest(
            `/api/watchlist/categories/${categoryId}`,
            {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name })
            }
        );
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

// CreateCategoryDialog.js
function CreateCategoryDialog({ open, onClose, onSubmit }) {
    const [name, setName] = useState('');
    
    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(name);
        setName('');
        onClose();
    };

    return (
        <Dialog open={open} onClose={onClose} title="新增分類">
            <form onSubmit={handleSubmit} className="add-category-form">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入分類名稱"
                    required
                />
                <div className="dialog-actions">
                    <button type="submit">確認</button>
                    <button type="button" onClick={onClose}>取消</button>
                </div>
            </form>
        </Dialog>
    );
}

// AddStockDialog.js
function AddStockDialog({ open, onClose, categoryId, onAdd }) {
    const [keyword, setKeyword] = useState('');
    const [results, setResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);

    // 修改: 允許任何輸入，但搜尋時過濾
    const handleInputChange = (e) => {
        const value = e.target.value;
        setKeyword(value);
        
        // 處理搜尋關鍵字
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

    // 搜尋邏輯
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
        <Dialog open={open} onClose={onClose} title="添加股票">
            <div className="add-stock-dialog">
                <input
                    type="text"
                    value={keyword}
                    onChange={handleInputChange}
                    placeholder="輸入股票代碼..."
                    className="stock-search-input"
                />
                
                {searchLoading && <div className="loading">搜尋中...</div>}
                {searchError && <div className="error-message">{searchError}</div>}
                
                <div className="search-results">
                    {results.map((stock) => (
                        <button
                        key={stock.symbol}
                        onClick={async () => {
                            try {
                                await onAdd(categoryId, stock);
                                onClose();
                            } catch (error) {
                                // 錯誤已在 handleAddStock 中處理
                                console.error('點擊處理失敗:', error);
                                }
                            }}
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

// EditCategoryDialog.js
function EditCategoryDialog({ open, onClose, category, onSubmit }) {
    const [name, setName] = useState('');

    useEffect(() => {
        if (category) {
            setName(category.name);
        }
    }, [category]);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(name);
    };

    return (
        <Dialog open={open} onClose={onClose} title="編輯分類">
            <form onSubmit={handleSubmit} className="edit-category-form">
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="請輸入分類名稱"
                    required
                />
                <div className="dialog-actions">
                    <button type="submit">確認</button>
                    <button type="button" onClick={onClose}>取消</button>
                </div>
            </form>
        </Dialog>
    );
}

// Watchlist 主元件
export function WatchlistContainer() {
    const { user } = useAuth();
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [toast, setToast] = useState(null);
    const [createCategoryOpen, setCreateCategoryOpen] = useState(false);
    const [addStockOpen, setAddStockOpen] = useState(false);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [editCategoryOpen, setEditCategoryOpen] = useState(false);
    const [editingCategory, setEditingCategory] = useState(null);

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

            setCategories(Array.isArray(categories) ? categories : []);
            setError(null);
            
            console.log('分類數據已更新到狀態');
        } catch (err) {
            console.error('載入分類失敗:', err);
            setError(getErrorMessage(err));
            showToast(getErrorMessage(err), 'error');
            setCategories([]);
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
        setSelectedCategoryId(categoryId);
        setAddStockOpen(true);
    };

    const handleCloseAddStockDialog = () => {
        setAddStockOpen(false);
        setSelectedCategoryId(null);
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

    const handleOpenCreateCategory = () => {
        setCreateCategoryOpen(true);
    };

    const handleCreateCategory = async (name) => {
        console.log('開始處理創建分類:', { name });
        try {
            setLoading(true);
            const result = await watchlistService.createCategory(name);
            console.log('API 回傳結果:', result);

            // 檢查回傳格式
            const newCategory = result.category || result;
            console.log('處理後的分類資料:', newCategory);
            
            // 更新本地狀態前的檢查
            console.log('更新前的分類列表:', categories);
            setCategories(prevCategories => {
                const updatedCategories = [...prevCategories, {
                    ...newCategory,
                    stocks: []
                }];
                console.log('更新後的分類列表:', updatedCategories);
                return updatedCategories;
            });
            
            setCreateCategoryOpen(false);
            showToast('分類創建成功', 'success');
        } catch (error) {
            console.error('創建分類失敗:', error);
            showToast(getErrorMessage(error), 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleEditCategory = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        setEditingCategory(category);
        setEditCategoryOpen(true);
    };

    const handleUpdateCategory = async (name) => {
        try {
            await watchlistService.updateCategory(editingCategory.id, name);
            showToast('分類已更新', 'success');
            await loadCategories();
            setEditCategoryOpen(false);
            setEditingCategory(null);
        } catch (error) {
            showToast(getErrorMessage(error), 'error');
        }
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

    const handleAddStock = async (categoryId, stock) => {
        try {
            console.log('開始添加股票:', {
                categoryId,
                stockSymbol: stock.symbol
            });
            
            const response = await watchlistService.addStock(categoryId, stock.symbol);
            console.log('添加股票響應:', response);
            
            await loadCategories();
            showToast(`已添加 ${stock.symbol} 到追蹤清單`, 'success');
        } catch (error) {
            console.error('添加股票失敗:', {
                error,
                name: error.name,
                message: error.message,
                response: error.response
            });

            // 檢查是否為重複添加的錯誤
            if (error.name === 'SequelizeUniqueConstraintError') {
                showToast(`${stock.symbol} 已在此分類中`, 'warning');
            } else {
                showToast(getErrorMessage(error), 'error');
            }
        }
    };

    return (
        <ErrorBoundary>
            <div className="watchlist-container">
                <div className="watchlist-header">
                    <h1>我的追蹤清單</h1>
                    <button 
                        onClick={handleOpenCreateCategory}
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

                <CreateCategoryDialog
                    open={createCategoryOpen}
                    onClose={() => setCreateCategoryOpen(false)}
                    onSubmit={handleCreateCategory}
                />
                
                <AddStockDialog
                    open={addStockOpen}
                    onClose={handleCloseAddStockDialog}
                    categoryId={selectedCategoryId}
                    onAdd={handleAddStock}
                />

                <EditCategoryDialog
                    open={editCategoryOpen}
                    onClose={() => {
                        setEditCategoryOpen(false);
                        setEditingCategory(null);
                    }}
                    category={editingCategory}
                    onSubmit={handleUpdateCategory}
                />
            </div>
        </ErrorBoundary>
    );
}

