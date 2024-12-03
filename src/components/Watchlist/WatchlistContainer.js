import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { Dialog } from '../Common/Dialog';
import { Analytics } from '../../utils/analytics';
import { handleApiError, getErrorMessage } from '../../utils/errorHandler';
import './styles/Watchlist.css';
import debounce from 'lodash/debounce';
import { FaPlus, FaEdit, FaTrash, FaSearch, FaListUl } from 'react-icons/fa';
import NewsDialog from './NewsDialog';
import { SearchBox } from './SearchBox';
import watchlistService from './services/watchlistService';
import { Toast } from './components/Toast';
import { CategoryManagerDialog } from './components/CategoryManagerDialog';
import { CreateCategoryDialog } from './components/CreateCategoryDialog';
import { EditCategoryDialog } from './components/EditCategoryDialog';
import { useCategories } from './hooks/useCategories';
import { CategoryTabs } from './components/CategoryTabs';
import { useToastManager } from './hooks/useToastManager';
import { StockCard } from './components/StockCard/StockCard';

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
        <Dialog open={open} onClose={onClose} title="搜尋股票代碼">
            <div className="add-stock-dialog">
                {/* 搜尋框容器 */}
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
                
                {/* 搜尋結果容器 */}
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

// 添加價格格式化函數
const formatPrice = (price) => {
    if (!price && price !== 0) return '-';
    
    // 將價格轉換為數字確保安全
    const numPrice = Number(price);
    
    // 根據數字大小決定小數位數
    if (numPrice >= 100) {
        return numPrice.toFixed(0);  // 三位數以上不顯示小數
    } else if (numPrice >= 10) {
        return numPrice.toFixed(1);  // 二位數顯示到小數第一位
    } else {
        return numPrice.toFixed(2);  // 一位數顯示到小數第二位
    }
};

// 添加判斷端點的函數
const isNearEdge = (price, support, resistance) => {
    if (!price || !support || !resistance) return { isNearUpper: false, isNearLower: false };
    
    const upperThreshold = (resistance - support) * 0.1; // 上下邊界的 10% 範圍
    const lowerThreshold = (resistance - support) * 0.1;
    
    return {
        isNearUpper: (resistance - price) <= upperThreshold,
        isNearLower: (price - support) <= lowerThreshold
    };
};

// Watchlist 主元件
export function WatchlistContainer() {
    const { user, isAuthenticated } = useAuth();
    const { toast, showToast, hideToast } = useToastManager();
    
    const [error, setError] = useState(null);
    
    // 使用 useCategories hook
    const {
        categories,
        loading,
        editingCategory,
        setEditingCategory,
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        handleCategoryDeleted
    } = useCategories(watchlistService, showToast);

    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [dialogStates, setDialogStates] = useState({
        categoryManager: false,
        createCategory: false,
        editCategory: false,
        addStock: false
    });
    const [isEditing, setIsEditing] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);
    const [newsDialogOpen, setNewsDialogOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState(null);
    const [showSearchResults, setShowSearchResults] = useState(false);

    // 使用 useRef 來保持搜尋框的狀態
    const searchRef = useRef(null);
    const [searchState, setSearchState] = useState({
        keyword: '',
        results: [],
        loading: false,
        error: null,
        showResults: false
    });

    // 處理點擊外部關閉搜尋結果
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
            userId: user?.id  // 添加用戶 ID 用於追
        });
    }, [showToast, user]);

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
        if (!categoryId) {
            showToast('請先選擇分類', 'warning');
            return;
        }
        setSelectedCategoryId(categoryId);
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

    const handleEditCategory = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            setEditingCategory(category);
            updateDialogState('editCategory', true);
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
        if (!categoryId) {
            showToast('請先選擇分類', 'warning');
            return;
        }
        
        try {
            await watchlistService.addStock(categoryId, stock.symbol);
            await loadCategories();
            showToast(`已添加 ${stock.symbol} 到追蹤清單`, 'success');
        } catch (error) {
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
        
        // 載入分類並自動選擇第一個
        const initializeCategories = async () => {
            const loadedCategories = await loadCategories();
            
            // 如果有分類且沒有選擇任何分類，則自動選擇第一個
            if (loadedCategories?.length > 0 && !activeTab) {
                const firstCategory = loadedCategories[0];
                setActiveTab(firstCategory.id);
                setSelectedCategoryId(firstCategory.id);
            }
        };

        initializeCategories();
    }, [isAuthenticated, loadCategories, showToast, activeTab]);

    const toggleEditMode = () => {
        setIsEditing(prev => !prev);
    };

    const handleNewsClick = (news) => {
        setSelectedNews(news);
        setNewsDialogOpen(true);
    };

    // 處理創建分類
    const handleCreateCategory = async (name) => {
        try {
            await createCategory(name);
            updateDialogState('createCategory', false);
        } catch (error) {
            console.error('創建分類失敗:', error);
        }
    };

    // 處理更新分類
    const handleUpdateCategory = async (name) => {
        try {
            if (!editingCategory) return;
            await updateCategory(editingCategory.id, name);
            // 關閉對話框
            updateDialogState('editCategory', false);
            setEditingCategory(null);
        } catch (error) {
            console.error('更新分類失敗:', error);
        }
    };

    // 處理刪除分類
    const handleDeleteCategory = async (categoryId) => {
        try {
            const result = await deleteCategory(categoryId);
            if (result.success) {
                // 處理分類刪除後的重選邏輯
                handleCategoryDeleted(categoryId, result.updatedCategories);
                updateDialogState('categoryManager', false);
            }
        } catch (error) {
            console.error('刪除分類失敗:', error);
        }
    };

    return (
        <ErrorBoundary>
            <div className="watchlist-container">
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError(null)}>關閉</button>
                    </div>
                )}
                
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
                                <CategoryTabs
                                    categories={categories}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    onManageCategories={() => updateDialogState('categoryManager', true)}
                                />
                                
                                {categories.map((category) => (
                                    <div
                                        key={category.id}
                                        className={`category-content ${activeTab === category.id ? 'active' : ''} ${isEditing ? 'editing' : ''}`}
                                    >
                                        <div className="category-operations">
                                            <button
                                                className={`edit-mode-button ${isEditing ? 'active' : ''}`}
                                                onClick={toggleEditMode}
                                                title={isEditing ? '完成編輯' : '編輯模式'}
                                            >
                                                <FaEdit />
                                            </button>
                                        </div>
                                        
                                        {activeTab === category.id && (
                                            <SearchBox
                                                onSelect={handleAddStock}
                                                watchlistService={watchlistService}
                                                categoryId={category.id}
                                            />
                                        )}
                                        
                                        <div className="stock-list">
                                            {category.stocks.map((stock) => (
                                                <StockCard
                                                    key={stock.id}
                                                    stock={stock}
                                                    onNewsClick={handleNewsClick}
                                                    onRemove={() => handleRemoveStock(category.id, stock.id)}
                                                />
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
                                    onCreate={() => updateDialogState('createCategory', true)}
                                />
                            </div>
                        )}
                    </>
                )}

                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={hideToast}
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
                        requestAnimationFrame(() => {
                            updateDialogState('editCategory', false);
                            setEditingCategory(null);
                        });
                    }}
                    category={editingCategory}
                    onSubmit={handleUpdateCategory}
                />

                <NewsDialog
                    news={selectedNews}
                    open={newsDialogOpen}
                    onClose={() => {
                        setNewsDialogOpen(false);
                        setSelectedNews(null);
                    }}
                />
            </div>
        </ErrorBoundary>
    );
}

