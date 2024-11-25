import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Dialog } from '../Common/Dialog';
import { Analytics } from '../../utils/analytics';
import { handleApiError, getErrorMessage } from '../../utils/errorHandler';
import './styles/Watchlist.css';
import debounce from 'lodash/debounce';
import { FaPlus, FaFolder, FaEdit, FaTrash } from 'react-icons/fa';

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
const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000);  // 3秒後自動消失
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className={`toast toast-${type}`}>
            {message}
            <button onClick={onClose}>✕</button>
        </div>
    );
};

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        await onSubmit(name);  // 只執行更新，不處理關閉
        // 移除這行，讓父組件控制關閉
        // onClose();
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

// CategoryManagerDialog.js
function CategoryManagerDialog({ open, onClose, categories, onEdit, onDelete, onCreate }) {
    return (
        <Dialog open={open} onClose={onClose} title="管理分類">
            <div className="category-manager-dialog">
                <button 
                    onClick={onCreate}
                    className="create-category-button"
                >
                    <FaPlus /> 新增分類
                </button>
                
                <div className="category-list">
                    {categories.map(category => (
                        <div key={category.id} className="category-item">
                            <span className="category-name">
                                {category.name}
                            </span>
                            <div className="category-actions">
                                <button
                                    onClick={() => onEdit(category.id)}
                                    className="edit-button"
                                    aria-label="編輯分類"
                                >
                                    <FaEdit />
                                </button>
                                <button
                                    onClick={() => onDelete(category.id)}
                                    className="delete-button"
                                    aria-label="刪除分類"
                                >
                                    <FaTrash />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </Dialog>
    );
}

// Watchlist 主元件
export function WatchlistContainer() {
    const { user, isAuthenticated } = useAuth();
    
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [dialogStates, setDialogStates] = useState({
        categoryManager: false,
        createCategory: false,
        editCategory: false,
        addStock: false
    });
    const [editingCategory, setEditingCategory] = useState(null);
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message, type) => {
        setToast({ message, type });
    }, []);

    const handleOperationError = useCallback((error, operation) => {
        const errorData = handleApiError(error);
        
        // 特別處理身份驗證相關錯誤
        if (errorData.errorCode === 'UNAUTHORIZED' || errorData.errorCode === 'SESSION_EXPIRED') {
            showToast('請重新登入', 'error');
            return;
        }
        
        showToast(errorData.message, 'error');
        Analytics.error({
            component: 'WatchlistContainer',
            action: operation,
            error: errorData,
            userId: user?.id  // 添加用戶 ID 用於追蹤
        });
    }, [showToast, user]);

    const loadCategories = useCallback(async () => {
        try {
            setLoading(true);
            const data = await watchlistService.getCategories();
            setCategories(data);
            if (data.length > 0 && !activeTab) {
                setActiveTab(data[0].id);
            }
        } catch (error) {
            handleOperationError(error, 'load_categories');
        } finally {
            setLoading(false);
        }
    }, [activeTab, handleOperationError]);

    const handleTabChange = (categoryId) => {
        setActiveTab(categoryId);
        setSelectedCategoryId(categoryId);
    };

    // 統一的對話框控制函數
    const updateDialogState = useCallback((dialogName, isOpen) => {
        setDialogStates(prev => ({
            ...prev,
            [dialogName]: isOpen
        }));
    }, []);

    const handleOpenAddStockDialog = (categoryId) => {
        updateDialogState('addStock', true);
    };

    const handleCloseAddStockDialog = () => {
        updateDialogState('addStock', false);
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
        updateDialogState('createCategory', true);
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
            
            updateDialogState('createCategory', false);
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
        if (category) {
            setEditingCategory(category);
            updateDialogState('editCategory', true);
        }
    };

    const handleUpdateCategory = async (name) => {
        try {
            if (!editingCategory) return;
            
            await watchlistService.updateCategory(editingCategory.id, name);
            
            // 先關閉對話框
            updateDialogState('editCategory', false);
            setEditingCategory(null);
            
            // 然後更新數據和顯示提示
            await loadCategories();
            showToast('分類已更新', 'success');
            
        } catch (error) {
            handleOperationError(error, 'update_category');
        }
    };

    const handleDeleteCategory = async (categoryId) => {
        try {
            if (!window.confirm('確定要刪除此分類嗎？此操作無法復原。')) {
                return;
            }

            await watchlistService.deleteCategory(categoryId);
            await loadCategories();
            showToast('分類已刪除', 'success');
            
            Analytics.watchlist.categoryDelete({
                categoryId,
                component: 'WatchlistContainer',
                action: 'delete_category'
            });
        } catch (error) {
            handleOperationError(error, 'delete_category');
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
            await watchlistService.addStock(categoryId, stock.symbol);
            await loadCategories();
            showToast(`已添加 ${stock.symbol} 到追蹤清單`, 'success');
        } catch (error) {
            // 特殊處理重複添加的情況
            if (error.name === 'SequelizeUniqueConstraintError') {
                showToast(`${stock.symbol} 已在此分類中`, 'warning');
            } else {
                handleOperationError(error, 'add_stock');
            }
        }
    };

    // 檢查用戶是否已登入
    useEffect(() => {
        if (!isAuthenticated) {
            showToast('請先登入後再使用此功能', 'warning');
            return;
        }
        loadCategories();
    }, [isAuthenticated, loadCategories, showToast]);

    return (
        <ErrorBoundary>
            <div className="watchlist-container">
                {!isAuthenticated ? (
                    <div className="auth-required">
                        <p>請先登入後再使用此功能</p>
                    </div>
                ) : loading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>載入中...</p>
                    </div>
                ) : (
                    <>
                        {categories.length === 0 ? (
                            <div className="empty-state">
                                <button onClick={handleCreateCategory}>
                                    建立第一個分類
                                </button>
                            </div>
                        ) : (
                            <div className="watchlist-content">
                                <div className="category-tabs">
                                    <button
                                        onClick={() => updateDialogState('categoryManager', true)}
                                        className="category-tab folder-tab"
                                        aria-label="管理分類"
                                    >
                                        <FaFolder />
                                    </button>
                                    {categories.map((category) => (
                                        <button
                                            key={category.id}
                                            className={`category-tab ${activeTab === category.id ? 'active' : ''}`}
                                            onClick={() => handleTabChange(category.id)}
                                        >
                                            {category.name}
                                        </button>
                                    ))}
                                </div>
                                
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className={`category-content ${activeTab === category.id ? 'active' : ''}`}
                                    >
                                        <div className="category-actions">
                                            <button
                                                onClick={() => handleOpenAddStockDialog(category.id)}
                                                className="add-stock-button"
                                            >
                                                添加股票
                                            </button>
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
                                
                                <CategoryManagerDialog
                                    open={dialogStates.categoryManager}
                                    onClose={() => updateDialogState('categoryManager', false)}
                                    categories={categories}
                                    onEdit={handleEditCategory}
                                    onDelete={handleDeleteCategory}
                                    onCreate={handleOpenCreateCategory}
                                />
                            </div>
                        )}
                    </>
                )}

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => {
                            // 使用 requestAnimationFrame 確保平滑過渡
                            requestAnimationFrame(() => {
                                setToast(null);
                            });
                        }}
                    />
                )}

                <CreateCategoryDialog
                    open={dialogStates.createCategory}
                    onClose={() => updateDialogState('createCategory', false)}
                    onSubmit={handleCreateCategory}
                />
                
                <AddStockDialog
                    open={dialogStates.addStock}
                    onClose={handleCloseAddStockDialog}
                    categoryId={selectedCategoryId}
                    onAdd={handleAddStock}
                />

                <EditCategoryDialog
                    open={dialogStates.editCategory}
                    onClose={() => {
                        // 確保在同一個事件循環中完成所有狀態更新
                        requestAnimationFrame(() => {
                            updateDialogState('editCategory', false);
                            setEditingCategory(null);
                        });
                    }}
                    category={editingCategory}
                    onSubmit={handleUpdateCategory}
                />
            </div>
        </ErrorBoundary>
    );
}

