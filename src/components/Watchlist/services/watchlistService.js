import enhancedApiClient from '../../../utils/enhancedApiClient';
import { handleApiError } from '../../../utils/errorHandler';
import csrfClient from '../../../utils/csrfClient'; // 導入 CSRF 客戶端

class WatchlistService {
    constructor() {
        this._categoriesRequest = null;
        this._categoriesCache = null;
        this._categoriesCacheTtlMs = 2000;
        this._categoriesLiteRequest = null;
        this._categoriesLiteCache = null;
    }

    _invalidateCategoriesCache() {
        this._categoriesRequest = null;
        this._categoriesCache = null;
        this._categoriesLiteRequest = null;
        this._categoriesLiteCache = null;
    }

    /**
     * 獲取包含 CSRF token 和超時設定的 Axios 配置。
     * @private
     * @returns {import('axios').AxiosRequestConfig}
     */
    _getApiConfig() {
        return {
            timeout: 120000 // 120秒
        };
    }

    /**
     * 處理 API 回應，更新 CSRF token 並解包(unwrap)資料。
     * @private
     * @param {Response|import('axios').AxiosResponse} response - Fetch 或 Axios 的回應物件
     * @returns {any} - API 回傳的業務資料
     */
    async _handleApiResponse(response) {
        // 從 'x-csrf-token' 標頭中獲取新的 token
        const newCsrfToken = response.headers.get ? response.headers.get('x-csrf-token') : response.headers['x-csrf-token'];
        if (newCsrfToken) {
            console.log('CSRF Token 更新:', newCsrfToken);
        }

        // 根據回應類型處理資料
        let data;
        if (response.json) {
            // Fetch 回應
            data = await response.json();
        } else {
            // Axios 回應
            data = response.data;
        }

        // 檢查後端自訂的回應結構，如果成功且有 data 屬性，則返回 data.data
        if (data && data.status === 'success' && data.hasOwnProperty('data')) {
            return data.data;
        }

        // 否則，返回整個 data 物件 (兼容舊的或不同的 API 格式)
        return data;
    }

    /**
     * 統一處理 API 呼叫的錯誤。
     * @private
     * @param {Error} error - 拋出的錯誤
     * @param {string} context - 錯誤發生的上下文（例如，函式名稱）
     */
    _handleApiError(error, context) {
        console.error(`WatchlistService Error in ${context}:`, error);
        // 使用通用的錯誤處理器來格式化錯誤，然後重新拋出
        throw handleApiError(error);
    }

    async getCategories() {
        try {
            if (this._categoriesCache && this._categoriesCache.expiresAt > Date.now()) {
                return this._categoriesCache.data;
            }

            if (this._categoriesRequest) {
                return this._categoriesRequest;
            }

            this._categoriesRequest = (async () => {
                const response = await csrfClient.fetchWithCSRF('/api/watchlist/categories', {
                    method: 'GET'
                });
                const responseData = await this._handleApiResponse(response);

                let categories = [];
                if (Array.isArray(responseData)) {
                    categories = responseData;
                } else if (responseData && Array.isArray(responseData.categories)) {
                    categories = responseData.categories;
                } else {
                    console.warn('Unexpected categories response format:', responseData);
                }

                this._categoriesCache = {
                    data: categories,
                    expiresAt: Date.now() + this._categoriesCacheTtlMs
                };

                return categories;
            })();

            return await this._categoriesRequest;
        } catch (error) {
            this._handleApiError(error, 'getCategories');
        } finally {
            this._categoriesRequest = null;
        }
    }

    async getCategoriesLite() {
        try {
            if (this._categoriesLiteCache && this._categoriesLiteCache.expiresAt > Date.now()) {
                return this._categoriesLiteCache.data;
            }

            if (this._categoriesLiteRequest) {
                return this._categoriesLiteRequest;
            }

            this._categoriesLiteRequest = (async () => {
                const response = await csrfClient.fetchWithCSRF('/api/watchlist/categories-lite', {
                    method: 'GET'
                });
                const responseData = await this._handleApiResponse(response);

                let categories = [];
                if (Array.isArray(responseData)) {
                    categories = responseData;
                } else if (responseData && Array.isArray(responseData.categories)) {
                    categories = responseData.categories;
                } else {
                    console.warn('Unexpected lite categories response format:', responseData);
                }

                this._categoriesLiteCache = {
                    data: categories,
                    expiresAt: Date.now() + this._categoriesCacheTtlMs
                };

                return categories;
            })();

            return await this._categoriesLiteRequest;
        } catch (error) {
            this._handleApiError(error, 'getCategoriesLite');
        } finally {
            this._categoriesLiteRequest = null;
        }
    }

    async createCategory(name) {
        try {
            const response = await csrfClient.post('/api/watchlist/categories', { name });
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'createCategory');
        }
    }

    async addStock(categoryId, stock) {
        try {
            const stockSymbol = typeof stock === 'string' ? stock : stock.symbol;
            const response = await csrfClient.post(`/api/watchlist/categories/${categoryId}/stocks`, { stockSymbol });
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'addStock');
        }
    }

    async removeStock(categoryId, itemId) {
        try {
            const response = await csrfClient.delete(`/api/watchlist/categories/${categoryId}/stocks/${itemId}`);
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'removeStock');
        }
    }

    async searchStocks(keyword) {
        try {
            if (!keyword || keyword.trim() === '') {
                return [];
            }
            // 對於 GET 請求，參數應放在 URL 中
            const response = await csrfClient.fetchWithCSRF(`/api/watchlist/search?keyword=${encodeURIComponent(keyword)}`, {
                method: 'GET'
            });
            const result = await this._handleApiResponse(response);

            if (Array.isArray(result)) {
                return result;
            } else if (result && Array.isArray(result.results)) {
                return result.results;
            }
            return [];
        } catch (error) {
            console.error('搜尋股票失敗:', error);
            // 根據原始邏輯，搜尋失敗時返回空陣列，不向上拋出錯誤
            return [];
        }
    }

    async deleteCategory(categoryId) {
        try {
            const response = await csrfClient.delete(`/api/watchlist/categories/${categoryId}`);
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'deleteCategory');
        }
    }

    async updateCategory(categoryId, name) {
        try {
            const response = await csrfClient.put(`/api/watchlist/categories/${categoryId}`, { name });
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'updateCategory');
        }
    }

    /**
     * 重新排序分類
     * @param {Array<{id: string, sortOrder: number}>} orders - 排序資料陣列
     */
    async reorderCategories(orders) {
        try {
            const response = await csrfClient.put('/api/watchlist/categories/reorder', { orders });
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'reorderCategories');
        }
    }

    /**
     * 重新排序分類內的股票
     * @param {string} categoryId - 分類 ID
     * @param {Array<{id: string, sortOrder: number}>} orders - 排序資料陣列
     */
    async reorderStocks(categoryId, orders) {
        try {
            const response = await csrfClient.put(
                `/api/watchlist/categories/${categoryId}/stocks/reorder`,
                { orders }
            );
            this._invalidateCategoriesCache();
            return await this._handleApiResponse(response);
        } catch (error) {
            this._handleApiError(error, 'reorderStocks');
        }
    }
}

// 創建單例實例
const watchlistService = new WatchlistService();

export default watchlistService;
