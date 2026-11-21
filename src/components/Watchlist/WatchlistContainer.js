import React, { Suspense, lazy, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../Auth/useAuth'; // 更新路徑
import { useNavigate } from 'react-router-dom';
import { FaLock, FaSearch } from 'react-icons/fa';

import './styles/Watchlist.css';

import { SearchBox } from './SearchBox';
import watchlistService from './services/watchlistService';
import { Toast } from './components/Toast';
import { useCategories } from './hooks/useCategories';
import { CategoryTabs } from './components/CategoryTabs';
import { useToastManager } from './hooks/useToastManager';
import { ErrorBoundary } from '../Common/ErrorBoundary/ErrorBoundary';
import { useStocks } from './hooks/useStocks';
import { Analytics } from '../../utils/analytics';
import { InfoTool } from '../Common/InfoTool/InfoTool';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import { buildSeoTitle, normalizeMetaDescription } from '../../utils/socialMetadata';
import { StaticStockList } from './components/StockCard/StaticStockList';
import { SortMenu } from './components/SortMenu';
import { PriceSentimentNotificationSettings } from './PriceSentimentNotificationSettings';
import { sortStocks, SORTABLE_COLUMNS } from './utils/sortStocks';

const loadDraggableStockList = () => import('./components/StockCard/DraggableStockList');

const CATEGORY_DYNAMIC_FIELDS = [
    'name', 'nameEn', 'price', 'change', 'changePercent', 'logo',
    'analysis', 'news', 'quoteStatus', 'analysisStatus'
];
const DraggableStockList = lazy(loadDraggableStockList);
const CategoryManagerDialog = lazy(() => import('./components/CategoryManagerDialog').then((module) => ({ default: module.CategoryManagerDialog })));
const CreateCategoryDialog = lazy(() => import('./components/CreateCategoryDialog').then((module) => ({ default: module.CreateCategoryDialog })));
const EditCategoryDialog = lazy(() => import('./components/EditCategoryDialog').then((module) => ({ default: module.EditCategoryDialog })));
const NewsDialog = lazy(() => import('./NewsDialog'));

// 欄位排序只是檢視，不寫進 DB 的 sortOrder，所以記在瀏覽器端、依分類各記一份。
const SORT_STORAGE_PREFIX = 'watchlist:sort:';
const NO_SORT = { key: null, direction: null };

const readStoredSort = (categoryId) => {
    if (!categoryId) {
        return NO_SORT;
    }

    try {
        const raw = window.localStorage.getItem(`${SORT_STORAGE_PREFIX}${categoryId}`);
        if (!raw) {
            return NO_SORT;
        }
        const parsed = JSON.parse(raw);
        if (SORTABLE_COLUMNS.includes(parsed?.key) && ['asc', 'desc'].includes(parsed?.direction)) {
            return { key: parsed.key, direction: parsed.direction };
        }
    } catch (error) {
        // 隱私模式讀不到、或存進去的值壞了。當作沒排序，不要讓它擋住清單。
    }

    return NO_SORT;
};

// Watchlist 主元件
export function WatchlistContainer() {
    const { t, i18n } = useTranslation();
    const currentLang = i18n.language; // 取得當前語言
    const navigate = useNavigate();
    const { user, isAuthenticated, checkAuthStatus } = useAuth();
    const isTemporaryFreeMode = process.env.REACT_APP_TEMPORARY_FREE_MODE === 'true';
    const isProUser = isTemporaryFreeMode || ['pro', 'premium'].includes(user?.plan);
    const { toast, showToast, hideToast } = useToastManager();

    const handleUpgrade = useCallback(() => {
        navigate(`/${currentLang}/subscription-plans`, {
            state: { reason: 'watchlist_upgrade_required' }
        });
    }, [currentLang, navigate]);

    const [error, setError] = useState(null);
    const [freePreviewCategories, setFreePreviewCategories] = useState([]);
    const [freePreviewLoading, setFreePreviewLoading] = useState(false);

    // 使用 useCategories hook
    const {
        categories,
        loading: categoriesLoading,
        editingCategory,
        setEditingCategory,
        setCategories, // 取得 setCategories 以支援樂觀更新
        loadCategories,
        loadCategoriesInitial,
        createCategory,
        updateCategory,
        deleteCategory,
        reorderCategories
    } = useCategories(watchlistService, showToast);

    const categoryDataLoadedRef = useRef(new Set());
    const categoryDataRequestsRef = useRef(new Map());
    const isMountedRef = useRef(false);

    const hydrateCategoryData = useCallback((categoryId, force = false) => {
        if (!categoryId) return Promise.resolve(false);

        const key = String(categoryId);
        if (!force && categoryDataLoadedRef.current.has(key)) {
            return Promise.resolve(true);
        }

        const activeRequest = categoryDataRequestsRef.current.get(key);
        if (activeRequest) {
            return force
                ? activeRequest.then(() => hydrateCategoryData(categoryId, true))
                : activeRequest;
        }

        const request = watchlistService.getCategoryData(categoryId)
            .then((hydratedCategory) => {
                if (!hydratedCategory || !Array.isArray(hydratedCategory.stocks)) {
                    throw new Error('Unexpected Watchlist category data response');
                }

                if (isMountedRef.current) {
                    const hydratedStocksById = new Map(
                        hydratedCategory.stocks.map(stock => [String(stock.id), stock])
                    );

                    // Merge market data only. The category structure and current order
                    // remain controlled by the initial/structural endpoint and local UI.
                    setCategories(currentCategories => currentCategories.map(category => {
                        if (String(category.id) !== key) return category;

                        return {
                            ...category,
                            stocks: (category.stocks || []).map(stock => {
                                const hydratedStock = hydratedStocksById.get(String(stock.id));
                                if (!hydratedStock) return stock;

                                return CATEGORY_DYNAMIC_FIELDS.reduce((nextStock, field) => {
                                    if (Object.prototype.hasOwnProperty.call(hydratedStock, field)) {
                                        nextStock[field] = hydratedStock[field];
                                    }
                                    return nextStock;
                                }, { ...stock });
                            })
                        };
                    }));
                }

                categoryDataLoadedRef.current.add(key);
                return true;
            })
            .catch((hydrateError) => {
                console.warn(`Watchlist category ${key} hydration failed:`, hydrateError);
                if (isMountedRef.current) {
                    setCategories(currentCategories => currentCategories.map(category => {
                        if (String(category.id) !== key) return category;
                        return {
                            ...category,
                            stocks: (category.stocks || []).map(stock => ({
                                ...stock,
                                quoteStatus: stock.quoteStatus === 'pending' ? 'error' : stock.quoteStatus,
                                analysisStatus: stock.analysisStatus === 'pending' ? 'error' : stock.analysisStatus
                            }))
                        };
                    }));
                }
                return false;
            })
            .finally(() => {
                if (categoryDataRequestsRef.current.get(key) === request) {
                    categoryDataRequestsRef.current.delete(key);
                }
            });

        categoryDataRequestsRef.current.set(key, request);
        return request;
    }, [setCategories]);

    const refreshCategoryAfterMutation = useCallback(async (categoryId, operation) => {
        if (!categoryId) return;

        // Refresh only category structure. The selected category's dynamic data is
        // fetched separately, so a stock add/remove never hydrates unrelated lists.
        await loadCategories(true);
        const key = String(categoryId);
        if (operation !== 'order') {
            categoryDataLoadedRef.current.delete(key);
            await hydrateCategoryData(categoryId, true);
        } else {
            await hydrateCategoryData(categoryId);
        }
    }, [loadCategories, hydrateCategoryData]);

    // 股票相關邏輯
    const handleStockOperationSuccess = useCallback((categoryId, operation) => {
        return refreshCategoryAfterMutation(categoryId, operation);
    }, [refreshCategoryAfterMutation]);

    const {
        handleAddStock: onAddStock,
        handleRemoveStock: onRemoveStockApi,
        handleReorderStocks: onReorderStocksApi
    } = useStocks(watchlistService, showToast, handleStockOperationSuccess);  // 添加成功回調

    // 合併 loading 狀態 - UX 優化：只在分類載入時顯示全頁 Loading，股票操作使用局部狀態或靜默更新
    const isLoading = isProUser ? categoriesLoading : freePreviewLoading;

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
    const [sortState, setSortState] = useState(NO_SORT);
    const [isEditing, setIsEditing] = useState(false);
    const [isEditModeReady, setIsEditModeReady] = useState(false);
    const [isPreparingEditMode, setIsPreparingEditMode] = useState(false);
    const [selectedNews, setSelectedNews] = useState(null);

    // Free 與 Pro 共用同一套分類／股票卡片 UI；Free 只換成平台精選資料，
    // 不再另外維護一套 ReadOnlyWatchlistList 版型。
    const displayCategories = useMemo(() => {
        if (isProUser) return categories;

        return (freePreviewCategories || []).map((category) => ({
            ...category,
            name: t('watchlist.freePreviewCategory', { defaultValue: category.name }),
            stocks: (category.stocks || []).map((stock, index) => {
                const symbol = String(stock.symbol || stock.stockSymbol || stock.stockCode || '').trim().toUpperCase();
                const hasPrice = stock.price !== undefined && stock.price !== null && stock.price !== ''
                    && Number.isFinite(Number(stock.price));

                return {
                    ...stock,
                    id: stock.id || `${category.id}-${symbol || index}`,
                    symbol,
                    name: stock.name || stock.stockName || symbol,
                    nameEn: stock.nameEn || stock.name || stock.stockName || symbol,
                    price: hasPrice ? Number(stock.price) : null,
                    news: Array.isArray(stock.news) ? stock.news : []
                };
            }).filter((stock) => stock.symbol)
        }));
    }, [categories, freePreviewCategories, isProUser, t]);

    const handleTabChange = (categoryId) => {
        setActiveTab(categoryId);
    };

    // 每個分類各自記住上次的排序
    useEffect(() => {
        setSortState(readStoredSort(activeTab));
    }, [activeTab]);

    const handleSortChange = useCallback((column, direction) => {
        const next = direction ? { key: column, direction } : NO_SORT;
        setSortState(next);

        if (!activeTab) {
            return;
        }

        try {
            const storageKey = `${SORT_STORAGE_PREFIX}${activeTab}`;
            if (next.key) {
                window.localStorage.setItem(storageKey, JSON.stringify(next));
            } else {
                window.localStorage.removeItem(storageKey);
            }
        } catch (error) {
            // 存不進去不影響當次排序
        }
    }, [activeTab]);

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
    // 檢查用戶是否已登入並載入資料
    useEffect(() => {
        if (!isAuthenticated) {
            showToast(t('watchlist.loginRequiredMessage'), 'warning');
            return;
        }

        let cancelled = false;

        if (!isProUser) {
            setFreePreviewLoading(true);
            watchlistService.getFreePreviewInitial()
                .then((categories) => {
                    if (cancelled) return;
                    setFreePreviewCategories(categories || []);

                    // Free preview uses the same progressive rendering contract as the
                    // personal Watchlist: show the curated symbols first, then enrich them.
                    watchlistService.getFreePreview()
                        .then((hydratedCategories) => {
                            if (!cancelled) setFreePreviewCategories(hydratedCategories || []);
                        })
                        .catch((hydrateError) => {
                            if (cancelled) return;
                            console.warn('Free Watchlist preview hydration failed:', hydrateError);
                            setFreePreviewCategories(currentCategories => currentCategories.map(category => ({
                                ...category,
                                stocks: (category.stocks || []).map(stock => ({
                                    ...stock,
                                    quoteStatus: stock.quoteStatus === 'pending' ? 'error' : stock.quoteStatus,
                                    analysisStatus: stock.analysisStatus === 'pending' ? 'error' : stock.analysisStatus
                                }))
                            })));
                        });
                })
                .catch((loadError) => {
                    if (!cancelled) setError(loadError.message || t('watchlist.loadFailed'));
                })
                .finally(() => {
                    if (!cancelled) setFreePreviewLoading(false);
                });
            return () => { cancelled = true; };
        }

        let retryCount = 0;
        const maxRetries = 3;

        const initializeCategories = async () => {
            try {
                const initialCategories = await loadCategoriesInitial();
                if (initialCategories === null) {
                    throw new Error('Initial Watchlist request failed');
                }
                if (!cancelled) {
                    // The selected category is hydrated by its own effect below.
                }
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
        return () => { cancelled = true; };
    }, [isAuthenticated, isProUser, loadCategories, loadCategoriesInitial, setCategories, showToast, t, checkAuthStatus, i18n.language]);

    useEffect(() => {
        const categoryDataRequests = categoryDataRequestsRef.current;
        const categoryDataLoaded = categoryDataLoadedRef.current;
        isMountedRef.current = true;
        return () => {
            isMountedRef.current = false;
            categoryDataRequests.clear();
            categoryDataLoaded.clear();
        };
    }, []);

    // Load the selected category on demand. Successful results are kept in state
    // and in the loaded-id set, so returning to a visited category makes no request.
    useEffect(() => {
        if (!isAuthenticated || !isProUser || !activeTab) return;
        hydrateCategoryData(activeTab);
    }, [activeTab, hydrateCategoryData, isAuthenticated, isProUser]);

    // 使用目前方案可見的分類設定預設標籤，避免 Free 有資料卻沒有 active category。
    useEffect(() => {
        if (displayCategories.length > 0 && !displayCategories.some((category) => category.id === activeTab)) {
            const firstCategoryWithStocks = displayCategories.find(category => category.stocks?.length > 0);
            setActiveTab((firstCategoryWithStocks || displayCategories[0]).id);
        } else if (displayCategories.length === 0 && activeTab) {
            setActiveTab(null);
        }
    }, [displayCategories, activeTab]);

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
    }, [setEditingCategory]);

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

    const handleNewsClick = (news, stockSymbol) => {
        Analytics.watchlist.newsClick({
            stockSymbol,
            newsSource: news?.source,
            newsUrl: news?.url
        });
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
        () => displayCategories.find((category) => category.id === activeTab) || null,
        [activeTab, displayCategories]
    );

    const sortedStocks = useMemo(
        () => sortStocks(activeCategory?.stocks || [], sortState.key, sortState.direction),
        [activeCategory, sortState]
    );

    // 拖曳寫的是永久的 sortOrder。在欄位排序後的畫面上拖，會把當下的顯示順序
    // 存成手動順序，使用者把排序歸零才發現原本拖好的順序被蓋掉。
    // 所以排序期間只關掉拖曳，刪除按鈕照留。
    const canDrag = isEditing && !sortState.key;

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
        // mainEntity is intentionally omitted until the page has a stable,
        // user-independent item list suitable for structured data.
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
                <title>{buildSeoTitle(t('watchlist.pageTitle'), t('pageContainer.defaultTitle'))}</title>
                <meta name="description" content={normalizeMetaDescription(t('watchlist.pageDescription'))} />
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
                    {isAuthenticated ? (
                        <div className="watchlist-header-actions">
                            {isProUser ? (
                                <PriceSentimentNotificationSettings />
                            ) : (
                                <button type="button" className="watchlist-locked-action" onClick={handleUpgrade}>
                                    <FaLock aria-hidden="true" />
                                    <span>{t('watchlist.priceSentimentNotifications.triggerButton')}</span>
                                    <span className="watchlist-locked-action__badge">PRO</span>
                                </button>
                            )}
                        </div>
                    ) : null}
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
                        {isProUser && displayCategories.length === 0 ? (
                            <div className="empty-state">
                            </div>
                        ) : displayCategories.length > 0 ? (
                            <div className="watchlist-content">
                                <CategoryTabs
                                    categories={displayCategories}
                                    activeTab={activeTab}
                                    onTabChange={handleTabChange}
                                    onManageCategories={isProUser
                                        ? () => updateDialogState('categoryManager', true)
                                        : handleUpgrade}
                                    manageLocked={!isProUser}
                                />

                                {!isProUser ? (
                                    <div className="watchlist-free-plan-note">
                                        <span>{t('watchlist.freePreviewDescription')}</span>
                                        <button type="button" onClick={handleUpgrade}>
                                            {t('watchlist.freeUpgradeCta', { defaultValue: '解鎖個人追蹤清單' })}
                                        </button>
                                    </div>
                                ) : null}

                                {activeCategory ? (
                                    <div
                                        key={activeCategory.id}
                                        className={`category-content active ${isProUser && isEditing ? 'editing' : ''}`}
                                    >
                                        <div className="watchlist-controls-row">
                                            {isProUser ? (
                                                <SearchBox
                                                    onSelect={onAddStock}
                                                    watchlistService={watchlistService}
                                                    categoryId={activeCategory.id}
                                                />
                                            ) : (
                                                <button type="button" className="watchlist-locked-search" onClick={handleUpgrade}>
                                                    <FaSearch aria-hidden="true" />
                                                    <span>{t('watchlist.searchBox.placeholder')}</span>
                                                    <FaLock className="watchlist-locked-search__lock" aria-hidden="true" />
                                                </button>
                                            )}

                                            <div className="watchlist-list-toolbar">
                                                <SortMenu
                                                    sortState={sortState}
                                                    onSortChange={handleSortChange}
                                                />
                                                <div className="category-operations">
                                                    {isProUser ? (
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
                                                            <span className="edit-mode-button__label">{t('watchlist.editMode.browse')}</span>
                                                        </button>
                                                    ) : null}
                                                    <button
                                                        type="button"
                                                        className={`edit-mode-button ${isProUser && isEditing ? 'active' : ''} ${!isProUser ? 'is-locked' : ''}`}
                                                        onClick={isProUser ? () => switchEditMode(true) : handleUpgrade}
                                                        aria-label={t('watchlist.editMode.switchToEdit')}
                                                        title={t('watchlist.editMode.switchToEdit')}
                                                        aria-pressed={isProUser ? isEditing : undefined}
                                                        data-testid="watchlist-edit-mode-button"
                                                        disabled={isPreparingEditMode}
                                                    >
                                                        {!isProUser ? <FaLock aria-hidden="true" /> : null}
                                                        <span className="edit-mode-button__label">{t('watchlist.editMode.edit')}</span>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {isProUser && canDrag ? (
                                            <Suspense fallback={null}>
                                                <DraggableStockList
                                                    stocks={sortedStocks}
                                                    categoryId={activeCategory.id}
                                                    onRemoveStock={onRemoveStock}
                                                    onReorder={onReorderStocks}
                                                    onNewsClick={handleNewsClick}
                                                    sortState={sortState}
                                                    onSortChange={handleSortChange}
                                                />
                                            </Suspense>
                                        ) : (
                                            <StaticStockList
                                                stocks={sortedStocks}
                                                categoryId={activeCategory.id}
                                                onRemoveStock={isProUser ? onRemoveStock : () => handleUpgrade()}
                                                onNewsClick={handleNewsClick}
                                                sortState={sortState}
                                                onSortChange={handleSortChange}
                                                isEditing={isProUser && isEditing}
                                            />
                                        )}
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
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
