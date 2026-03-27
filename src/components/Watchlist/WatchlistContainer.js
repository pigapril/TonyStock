import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../Auth/useAuth'; // 更新路徑

import './styles/Watchlist.css';

import { SearchBox } from './SearchBox';
import watchlistService from './services/watchlistService';
import { Toast } from './components/Toast';
import { useCategories } from './hooks/useCategories';
import { CategoryTabs } from './components/CategoryTabs';
import { useToastManager } from './hooks/useToastManager';
import { ErrorBoundary } from '../Common/ErrorBoundary/ErrorBoundary';
import { useStocks } from './hooks/useStocks';
import { InfoTool } from '../Common/InfoTool/InfoTool';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { StaticStockList } from './components/StockCard/StaticStockList';

const loadDraggableStockList = () => import('./components/StockCard/DraggableStockList');
const DraggableStockList = lazy(loadDraggableStockList);
const CategoryManagerDialog = lazy(() => import('./components/CategoryManagerDialog').then((module) => ({ default: module.CategoryManagerDialog })));
const CreateCategoryDialog = lazy(() => import('./components/CreateCategoryDialog').then((module) => ({ default: module.CreateCategoryDialog })));
const EditCategoryDialog = lazy(() => import('./components/EditCategoryDialog').then((module) => ({ default: module.EditCategoryDialog })));
const NewsDialog = lazy(() => import('./NewsDialog'));

// Watchlist 主元件
export function WatchlistContainer() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language; // 取得當前語言
    const { user, isAuthenticated, checkAuthStatus } = useAuth();
    const { toast, showToast, hideToast } = useToastManager();

    const [error, setError] = useState(null);

    // 使用 useCategories hook
    const {
        categories,
        loading: categoriesLoading,
        editingCategory,
        setEditingCategory,
        setCategories, // 取得 setCategories 以支援樂觀更新
        loadCategories,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories
    } = useCategories(watchlistService, showToast);

    // 股票相關邏輯
    const handleStockOperationSuccess = useCallback(() => {
        loadCategories(true);  // 使用 silent refresh (true) 避免全頁 Loading
    }, [loadCategories]);

    const {
        handleAddStock: onAddStock,
        handleRemoveStock: onRemoveStockApi,
        handleReorderStocks: onReorderStocksApi
    } = useStocks(watchlistService, showToast, handleStockOperationSuccess);  // 添加成功回調

    // 合併 loading 狀態 - UX 優化：只在分類載入時顯示全頁 Loading，股票操作使用局部狀態或靜默更新
    const isLoading = categoriesLoading;

    // 實作樂觀更新的股票排序
    const onReorderStocks = useCallback(async (categoryId, orders) => {
        // 1. 立即更新本地狀態 (Optimistic Update)
        const previousCategories = [...categories];

        setCategories(prevCategories => {
            return prevCategories.map(category => {
                if (category.id === categoryId) {
                    const stockMap = new Map(category.stocks.map(stock => [stock.id, stock]));
                    const newStocks = orders
                        .sort((a, b) => a.sortOrder - b.sortOrder)
                        .map(order => stockMap.get(order.id))
                        .filter(Boolean);

                    return {
                        ...category,
                        stocks: newStocks
                    };
                }
                return category;
            });
        });

        // 2. 背景發送 API 請求
        try {
            await onReorderStocksApi(categoryId, orders);
        } catch (error) {
            // 3. 失敗時回滾
            console.error('Reorder stocks failed, rolling back:', error);
            setCategories(previousCategories);
        }
    }, [categories, setCategories, onReorderStocksApi]);

    // 實作樂觀更新的股票刪除
    const onRemoveStock = useCallback(async (categoryId, stockId) => {
        // 1. 立即更新本地狀態
        const previousCategories = [...categories];

        setCategories(prevCategories => {
            return prevCategories.map(category => {
                if (category.id === categoryId) {
                    return {
                        ...category,
                        stocks: category.stocks.filter(s => s.id !== stockId)
                    };
                }
                return category;
            });
        });

        // 2. 背景發送 API 請求
        const success = await onRemoveStockApi(categoryId, stockId);

        // 3. 失敗時回滾
        if (!success) {
            console.error('Remove stock failed, rolling back');
            setCategories(previousCategories);
        }
    }, [categories, setCategories, onRemoveStockApi]);

    const [activeTab, setActiveTab] = useState(null);
    const [dialogStates, setDialogStates] = useState({
        categoryManager: false,
        createCategory: false,
        editCategory: false
    });
    const [isEditing, setIsEditing] = useState(false);
    const [isEditModeReady, setIsEditModeReady] = useState(false);
    const [isPreparingEditMode, setIsPreparingEditMode] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    const handleTabChange = (categoryId) => {
        setActiveTab(categoryId);
    };

    // 統一的對話框控制函數
    const updateDialogState = useCallback((dialogName, isOpen) => {
        setDialogStates(prev => ({
            ...prev,
            [dialogName]: isOpen
        }));
    }, []);

    const handleEditCategory = (categoryId) => {
        const category = categories.find(c => c.id === categoryId);
        if (category) {
            setEditingCategory(category);
            updateDialogState('editCategory', true);
        }
    };

    // ✅ 新增：主動權限檢查 (Pre-emptive Check)
    // 如果前端狀態已經更新為 free，直接導走
    useEffect(() => {
        // 检查临时免费模式
        const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';

        if (isAuthenticated && user?.plan === 'free' && !isTemporaryFreeMode) {
            // 顯示提示後導轉到訂閱頁面
            showToast(t('watchlist.upgradeRequired'), 'info');
            setTimeout(() => {
                window.location.href = `/${i18n.language}/subscription-plans`;
            }, 1500);
        }
    }, [user, isAuthenticated, i18n.language, showToast, t]);

    // 檢查用戶是否已登入並載入資料
    useEffect(() => {
        if (!isAuthenticated) {
            showToast(t('watchlist.loginRequiredMessage'), 'warning');
            return;
        }

        let retryCount = 0;
        const maxRetries = 3;

        const initializeCategories = async () => {
            try {
                await loadCategories();
            } catch (error) {
                // ✅ 攔截 403 (後端判定無權限)
                if (error.response?.status === 403) {
                    console.warn('WatchlistContainer: 403 Forbidden detected, refreshing auth status and redirecting.');

                    // 1. 同步用戶狀態
                    if (checkAuthStatus) {
                        checkAuthStatus().catch(err => {
                            console.error('Failed to refresh auth status:', err);
                        });
                    }

                    // 2. 導向訂閱頁面
                    showToast(t('watchlist.upgradeRequired'), 'info');
                    setTimeout(() => {
                        window.location.href = `/${i18n.language}/subscription-plans`;
                    }, 1500);
                    return;
                }

                if (retryCount < maxRetries) {
                    retryCount++;
                    showToast(t('watchlist.loadingRetry', { count: retryCount, max: maxRetries }), 'info');
                    // 延遲 5 秒後重試
                    setTimeout(initializeCategories, 5000);
                } else {
                    setError(t('watchlist.loadFailed'));
                }
            }
        };

        initializeCategories();
    }, [isAuthenticated, loadCategories, showToast, t, checkAuthStatus, i18n.language]);

    // 當分類載入完成且無作用中標籤時，設定預設標籤
    useEffect(() => {
        if (categories?.length > 0 && !activeTab) {
            const firstCategory = categories[0];
            setActiveTab(firstCategory.id);
        }
    }, [categories, activeTab]);

    // 監聽登出事件，重置狀態
    useEffect(() => {
        const handleLogout = () => {
            setActiveTab(null);
            setDialogStates({
                categoryManager: false,
                createCategory: false,
                editCategory: false
            });
            setIsEditing(false);
            setEditingCategory(null);
            setSelectedNews(null);
            setError(null);
        };

        window.addEventListener('logoutSuccess', handleLogout);
        return () => {
            window.removeEventListener('logoutSuccess', handleLogout);
        };
    }, []);

    useEffect(() => {
        if (isEditModeReady || isLoading || !isAuthenticated || categories.length === 0) {
            return undefined;
        }

        let cancelled = false;

        const preloadEditMode = () => {
            loadDraggableStockList()
                .then(() => {
                    if (!cancelled) {
                        setIsEditModeReady(true);
                    }
                })
                .catch((error) => {
                    console.error('Failed to preload draggable stock list:', error);
                });
        };

        if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
            const idleId = window.requestIdleCallback(preloadEditMode, { timeout: 1200 });
            return () => {
                cancelled = true;
                window.cancelIdleCallback(idleId);
            };
        }

        const timeoutId = window.setTimeout(preloadEditMode, 0);
        return () => {
            cancelled = true;
            window.clearTimeout(timeoutId);
        };
    }, [categories.length, isAuthenticated, isEditModeReady, isLoading]);

    const switchEditMode = useCallback(async (nextIsEditing) => {
        if (nextIsEditing === isEditing) {
            return;
        }

        if (!nextIsEditing) {
            setIsEditing(false);
            return;
        }

        if (isEditModeReady) {
            setIsEditing(true);
            return;
        }

        setIsPreparingEditMode(true);
        try {
            await loadDraggableStockList();
            setIsEditModeReady(true);
            setIsEditing(true);
        } catch (error) {
            console.error('Failed to enter edit mode:', error);
        } finally {
            setIsPreparingEditMode(false);
        }
    }, [isEditing, isEditModeReady]);

    const handleNewsClick = (news) => {
        setSelectedNews(news);
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
                if (categoryId === activeTab) {
                    const nextCategory = result.updatedCategories?.[0];
                    setActiveTab(nextCategory?.id || null);
                }
                updateDialogState('categoryManager', false);
            }
        } catch (error) {
            console.error('刪除分類失敗:', error);
        }
    };

    const activeCategory = useMemo(
        () => categories.find((category) => category.id === activeTab) || null,
        [activeTab, categories]
    );

    // 3. 使用 useMemo 來定義 JSON-LD，並加入 currentLang 作為依賴
    const watchlistJsonLd = useMemo(() => ({
        "@context": "https://schema.org",
        "@type": "WebPage", // 或者更適合的類型，例如 CollectionPage
        "name": t('watchlist.jsonLd.name'), // 從翻譯檔讀取
        "description": t('watchlist.jsonLd.description'), // 從翻譯檔讀取
        // 4. 動態生成包含語言的 URL
        "url": `${window.location.origin}/${currentLang}/watchlist`,
        "inLanguage": currentLang, // 5. 添加 inLanguage 屬性
        "potentialAction": {
            "@type": "SearchAction",
            // 6. (可選) 更新 target URL 以包含語言，或確保後端能處理
            "target": `${window.location.origin}/${currentLang}/watchlist?category={category}&stock={stock}`,
            "query-input": "required name=category,stock"
        }
        // 如果頁面主要內容是關於列表，可以考慮添加 mainEntity
        // "mainEntity": {
        //   "@type": "ItemList",
        //   "name": t('watchlist.jsonLd.itemListTitle'), // e.g., "My Watchlist Stocks"
        //   // 如果可能，可以列出一些項目
        //   // "itemListElement": [ ... ]
        // }
    }), [t, currentLang]); // 加入 currentLang 作為依賴

    return (
        <ErrorBoundary
            message={error}
            onRetry={() => {
                setError(null);
                loadCategories();
            }}
        >
            {/* 7. 在 Helmet 中使用定義好的 watchlistJsonLd */}
            <Helmet>
                <title>{t('watchlist.pageTitle')} | Sentiment Inside Out</title>
                <meta name="description" content={t('watchlist.pageDescription')} />
                {/* 其他 meta 標籤... */}
                <script type="application/ld+json">
                    {JSON.stringify(watchlistJsonLd)}
                </script>
                {/* 注意：hreflang 標籤應該由 App.js 中的 PageContainer 或類似的全局組件處理，
                    這裡不需要重複添加，除非 WatchlistContainer 是獨立渲染的入口 */}
            </Helmet>
            <div className="watchlist-container">
                {/* 新的標題設計 */}
                <div className="watchlist-header-section">
                    <div className="watchlist-title-group">
                        <div className="watchlist-title-row">
                            <h1 className="watchlist-main-title">
                                {t('watchlist.pageTitle')}
                            </h1>
                            <div className="info-tool-wrapper watchlist-title-info">
                                <InfoTool
                                    content={t('watchlist.infoTooltip')}
                                    position="bottom-right"
                                    className="watchlist-infotool"
                                />
                            </div>
                        </div>
                        <div className="watchlist-subtitle-container">
                            <p className="watchlist-subtitle">{t('watchlist.pageSubtitle')}</p>
                        </div>
                    </div>
                </div>
                {error && (
                    <div className="error-message">
                        {error}
                        <button onClick={() => setError(null)}>{t('common.close')}</button>
                    </div>
                )}

                {!isAuthenticated ? (
                    <div className="auth-required">
                        <p>{t('watchlist.loginRequiredMessage')}</p>
                    </div>
                ) : isLoading ? (
                    <div className="watchlist-loading-state">
                        <div className="loading-spinner">
                            <div className="spinner"></div>
                            <p>{t('watchlist.loadingMessage')}</p>
                        </div>
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

                                {activeCategory ? (
                                    <div
                                        key={activeCategory.id}
                                        className={`category-content active ${isEditing ? 'editing' : ''}`}
                                    >
                                        <div className="watchlist-controls-row">
                                            <SearchBox
                                                onSelect={onAddStock}
                                                watchlistService={watchlistService}
                                                categoryId={activeCategory.id}
                                            />

                                            <div className="watchlist-list-toolbar">
                                                <div className="category-operations">
                                                    <button
                                                        type="button"
                                                        className={`edit-mode-button ${!isEditing ? 'active' : ''}`}
                                                        onClick={() => switchEditMode(false)}
                                                        aria-label={t('watchlist.editMode.switchToBrowse')}
                                                        title={t('watchlist.editMode.switchToBrowse')}
                                                        aria-pressed={!isEditing}
                                                        data-testid="watchlist-browse-mode-button"
                                                        disabled={isPreparingEditMode}
                                                    >
                                                        <span className="edit-mode-button__label">
                                                            {t('watchlist.editMode.browse')}
                                                        </span>
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`edit-mode-button ${isEditing ? 'active' : ''}`}
                                                        onClick={() => switchEditMode(true)}
                                                        aria-label={t('watchlist.editMode.switchToEdit')}
                                                        title={t('watchlist.editMode.switchToEdit')}
                                                        aria-pressed={isEditing}
                                                        data-testid="watchlist-edit-mode-button"
                                                        disabled={isPreparingEditMode}
                                                    >
                                                        <span className="edit-mode-button__label">
                                                            {t('watchlist.editMode.edit')}
                                                        </span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <Suspense fallback={null}>
                                                <DraggableStockList
                                                    stocks={activeCategory.stocks}
                                                    categoryId={activeCategory.id}
                                                    onRemoveStock={onRemoveStock}
                                                    onReorder={onReorderStocks}
                                                    onNewsClick={handleNewsClick}
                                                />
                                            </Suspense>
                                        ) : (
                                            <StaticStockList
                                                stocks={activeCategory.stocks}
                                                categoryId={activeCategory.id}
                                                onRemoveStock={onRemoveStock}
                                                onNewsClick={handleNewsClick}
                                            />
                                        )}
                                    </div>
                                ) : null}
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

                {dialogStates.categoryManager ? (
                    <Suspense fallback={null}>
                        <CategoryManagerDialog
                            open={dialogStates.categoryManager}
                            onClose={() => updateDialogState('categoryManager', false)}
                            categories={categories}
                            onEdit={handleEditCategory}
                            onDelete={handleDeleteCategory}
                            onCreate={() => updateDialogState('createCategory', true)}
                            onReorder={reorderCategories}
                        />
                    </Suspense>
                ) : null}

                {dialogStates.createCategory ? (
                    <Suspense fallback={null}>
                        <CreateCategoryDialog
                            open={dialogStates.createCategory}
                            onClose={() => updateDialogState('createCategory', false)}
                            onSubmit={handleCreateCategory}
                        />
                    </Suspense>
                ) : null}

                {dialogStates.editCategory ? (
                    <Suspense fallback={null}>
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
                    </Suspense>
                ) : null}

                {selectedNews ? (
                    <Suspense fallback={null}>
                        <NewsDialog
                            news={selectedNews}
                            open={Boolean(selectedNews)}
                            onClose={() => {
                                setSelectedNews(null);
                            }}
                        />
                    </Suspense>
                ) : null}
            </div>
        </ErrorBoundary>
    );
}
