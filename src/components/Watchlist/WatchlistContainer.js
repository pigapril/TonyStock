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
import { ErrorBoundary } from '../Common/ErrorBoundary/ErrorBoundary';
import { formatPrice, isNearEdge } from '../Common/priceUtils';
import { useStocks } from './hooks/useStocks';
import { InfoTool } from '../Common/InfoTool/InfoTool';

// Watchlist 主元件
export function WatchlistContainer() {
    const { user, isAuthenticated } = useAuth();
    const { toast, showToast, hideToast } = useToastManager();
    
    const [error, setError] = useState(null);
    
    // 使用 useCategories hook
    const {
        categories,
        loading: categoriesLoading,
        editingCategory,
        setEditingCategory,
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        handleCategoryDeleted
    } = useCategories(watchlistService, showToast);

    // 股票相關邏輯
    const handleStockOperationSuccess = useCallback(() => {
        loadCategories();  // 重新載入分類資料
    }, [loadCategories]);

    const {
        loading: stocksLoading,
        handleAddStock: onAddStock,
        handleRemoveStock: onRemoveStock
    } = useStocks(watchlistService, showToast, handleStockOperationSuccess);  // 添加成功回調

    // 合併 loading 狀態
    const isLoading = categoriesLoading || stocksLoading;

    const [activeTab, setActiveTab] = useState(null);
    const [selectedCategoryId, setSelectedCategoryId] = useState(null);
    const [dialogStates, setDialogStates] = useState({
        categoryManager: false,
        createCategory: false,
        editCategory: false
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

    // 檢查用戶是否已登入
    useEffect(() => {
        if (!isAuthenticated) {
            showToast('請先登入後再使用此功能', 'warning');
            return;
        }
        
        let retryCount = 0;
        const maxRetries = 3;
        
        const initializeCategories = async () => {
            try {
                const loadedCategories = await loadCategories();
                
                if (loadedCategories?.length > 0 && !activeTab) {
                    const firstCategory = loadedCategories[0];
                    setActiveTab(firstCategory.id);
                    setSelectedCategoryId(firstCategory.id);
                }
            } catch (error) {
                if (retryCount < maxRetries) {
                    retryCount++;
                    showToast(`載入中，請稍候... (${retryCount}/${maxRetries})`, 'info');
                    // 延遲 5 秒後重試
                    setTimeout(initializeCategories, 5000);
                } else {
                    setError('載入失敗，請重新整理頁面');
                }
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
            updateDialogState('createCategory', false);
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
                // 處理分類刪除的重選邏輯
                handleCategoryDeleted(categoryId, result.updatedCategories);
                updateDialogState('categoryManager', false);
            }
        } catch (error) {
            console.error('刪除分類失敗:', error);
        }
    };

    return (
        <ErrorBoundary
            message={error}
            onRetry={() => {
                setError(null);
                loadCategories();
            }}
        >
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
                ) : isLoading ? (
                    <div className="loading-spinner">
                        <div className="spinner"></div>
                        <p>載入中...</p>
                    </div>
                ) : (
                    <>
                        {categories.length === 0 ? (
                            <div className="empty-state">
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
                                            <div className="info-tool-wrapper">
                                                <InfoTool
                                                    content="添加股票後，將自動根據股票長期(3.5年)趨勢，計算出極度悲觀和極度樂觀價格，方便同時查看和比較不同股票價格的情緒位階"
                                                    position="bottom-right"
                                                    className="watchlist-infotool"
                                                />
                                            </div>
                                        </div>
                                        
                                        {activeTab === category.id && (
                                            <SearchBox
                                                onSelect={onAddStock}
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
                                                    onRemove={() => onRemoveStock(category.id, stock.id)}
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

